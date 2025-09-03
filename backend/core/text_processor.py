"""
RAG Tool Standalone - Text Processing Module
CRITICAL: This module preserves the EXACT text processing algorithms from the original system.
DO NOT MODIFY the chunking algorithm, embedding model, or file format support.
"""

import os
import io
import csv
import re
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
import asyncio

# Core dependencies - these MUST be available
try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from pathlib import Path

# Additional imports for expanded file support
try:
    from pptx import Presentation
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

try:
    from docx import Document
    PYTHON_DOCX_AVAILABLE = True
except ImportError:
    PYTHON_DOCX_AVAILABLE = False

try:
    import xlrd
    XLRD_AVAILABLE = True
except ImportError:
    XLRD_AVAILABLE = False

try:
    import olefile
    OLEFILE_AVAILABLE = True
except ImportError:
    OLEFILE_AVAILABLE = False

# Markdown conversion imports for hyperlink preservation
try:
    import mammoth
    import markdownify
    import pdfplumber
    MARKDOWN_CONVERSION_AVAILABLE = True
except ImportError:
    MARKDOWN_CONVERSION_AVAILABLE = False

# Initialize OpenAI client
openai_client = None

def get_openai_client():
    """Get OpenAI client with API key from environment."""
    global openai_client
    if openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        base_url = os.getenv("EMBEDDING_BASE_URL", "https://api.openai.com/v1")
        openai_client = OpenAI(api_key=api_key, base_url=base_url)
    return openai_client

def sanitize_text(text: str) -> str:
    """
    Sanitize text by removing null characters and other problematic Unicode.
    
    Args:
        text: The text to sanitize
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Remove null characters
    text = text.replace('\x00', '')
    
    # Remove other control characters except newlines and tabs
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)
    
    # Normalize whitespace (multiple spaces to single space)
    text = re.sub(r' +', ' ', text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text

# CRITICAL: This function MUST be preserved EXACTLY - DO NOT MODIFY
def chunk_text(text: str, chunk_size: int = 400, overlap: int = 0) -> List[str]:
    """
    Chunk text into smaller pieces with optional overlap.
    
    Args:
        text: The text to chunk
        chunk_size: The size of each chunk in characters (MUST BE 400)
        overlap: The number of characters to overlap between chunks (MUST BE 0 for 20% = 80)
        
    Returns:
        List of text chunks
    """
    # Sanitize the text first
    text = sanitize_text(text)
    
    if not text:
        return []
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap if overlap > 0 else end
    
    return chunks

# CRITICAL: This function MUST be preserved EXACTLY - DO NOT MODIFY
def create_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Create embeddings for a list of text chunks using OpenAI text-embedding-3-small.
    
    Args:
        texts: List of text chunks to embed
        
    Returns:
        List of embedding vectors (1536 dimensions)
    """
    if not texts:
        return []
    
    # Sanitize all texts before embedding
    sanitized_texts = [sanitize_text(text) for text in texts]
    # Filter out empty strings
    sanitized_texts = [text for text in sanitized_texts if text]
    
    if not sanitized_texts:
        return []
    
    client = get_openai_client()
    response = client.embeddings.create(
        model="text-embedding-3-small",  # NEVER CHANGE THIS
        input=sanitized_texts
    )
    
    # Extract the embedding vectors from the response
    embeddings = [item.embedding for item in response.data]
    
    return embeddings

# File extraction functions - preserve ALL format support
def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file using basic XML parsing."""
    try:
        with zipfile.ZipFile(io.BytesIO(file_content)) as zipf:
            if 'word/document.xml' in zipf.namelist():
                with zipf.open('word/document.xml') as xml_file:
                    tree = ET.parse(xml_file)
                    root = tree.getroot()
                    
                    texts = []
                    for elem in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                        if elem.text:
                            texts.append(elem.text)
                    
                    return sanitize_text(' '.join(texts))
        return ""
    except Exception as e:
        print(f"Error extracting text from DOCX: {e}")
        return sanitize_text(file_content.decode('utf-8', errors='ignore'))

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file."""
    if not PYPDF_AVAILABLE:
        print("pypdf not available, cannot extract from PDF")
        return ""
    
    try:
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
            temp_pdf.write(file_content)
            temp_pdf_path = temp_pdf.name
        
        text = []
        with open(temp_pdf_path, 'rb') as pdf_file:
            pdf_reader = pypdf.PdfReader(pdf_file)
            num_pages = len(pdf_reader.pages)
            
            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
        
        os.remove(temp_pdf_path)
        return sanitize_text(' '.join(text))
    
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def extract_text_from_file(file_content: bytes, mime_type: str, file_name: str, config: Dict[str, Any] = None) -> str:
    """
    Extract text from a file based on its MIME type.
    PRESERVES ALL FILE FORMAT SUPPORT from original system.
    
    Args:
        file_content: Binary content of the file
        mime_type: MIME type of the file
        file_name: Name of the file for extension-based fallback
        config: Configuration dictionary
        
    Returns:
        Extracted text from the file
    """
    text = ""
    
    # PDF files
    if 'application/pdf' in mime_type:
        text = extract_text_from_pdf(file_content)
    # DOCX files - try markdown conversion first (preserves hyperlinks, filters images)
    elif mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or file_name.endswith('.docx'):
        # Try markdown conversion first
        markdown_text = convert_to_markdown_with_links(file_content, mime_type, file_name)
        if markdown_text and len(markdown_text.strip()) > 50:
            print(f"Successfully converted {file_name} to markdown with hyperlinks preserved")
            text = markdown_text
        else:
            print(f"Markdown conversion failed for {file_name}, falling back to original extraction")
            text = extract_text_from_docx(file_content)
    # Plain text files
    elif mime_type.startswith('text/') or file_name.endswith('.txt'):
        try:
            text = file_content.decode('utf-8', errors='replace')
        except:
            text = ""
    # HTML files
    elif mime_type == 'text/html' or file_name.endswith('.html'):
        try:
            html_content = file_content.decode('utf-8', errors='replace')
            # Simple HTML tag removal
            text = re.sub(r'<[^>]+>', ' ', html_content)
        except:
            text = ""
    # CSV files
    elif mime_type == 'text/csv' or file_name.endswith('.csv'):
        try:
            text = file_content.decode('utf-8', errors='replace')
        except:
            text = ""
    # Google Docs (exported as HTML) - convert to markdown to preserve hyperlinks
    elif mime_type == 'application/vnd.google-apps.document':
        try:
            html_content = file_content.decode('utf-8', errors='replace')
            if html_content and len(html_content.strip()) > 50:
                # Convert HTML to Markdown using markdownify to preserve hyperlinks
                if MARKDOWN_CONVERSION_AVAILABLE:
                    import markdownify
                    markdown_content = markdownify.markdownify(html_content, heading_style="ATX")
                    text = sanitize_text(markdown_content)
                else:
                    # Fallback: extract text from HTML
                    text = re.sub(r'<[^>]+>', ' ', html_content)
                    text = sanitize_text(text)
            else:
                text = html_content
        except:
            text = file_content.decode('utf-8', errors='replace')
    # Google Sheets (exported as CSV)
    elif mime_type == 'application/vnd.google-apps.spreadsheet':
        try:
            text = file_content.decode('utf-8', errors='replace')
        except:
            text = ""
    # Google Slides (exported as HTML) - convert to markdown to preserve hyperlinks
    elif mime_type == 'application/vnd.google-apps.presentation':
        try:
            html_content = file_content.decode('utf-8', errors='replace')
            if MARKDOWN_CONVERSION_AVAILABLE and html_content:
                import markdownify
                markdown_content = markdownify.markdownify(html_content, heading_style="ATX")
                text = sanitize_text(markdown_content)
            else:
                # Fallback: extract text from HTML
                text = re.sub(r'<[^>]+>', ' ', html_content)
                text = sanitize_text(text)
        except:
            text = file_content.decode('utf-8', errors='replace')
    # Markdown files
    elif mime_type in ['text/markdown', 'text/x-markdown'] or file_name.endswith('.md'):
        try:
            text = file_content.decode('utf-8', errors='replace')
        except:
            text = ""
    # Image files (just return filename as content)
    elif mime_type.startswith('image'):
        text = file_name
    # Other file types
    else:
        try:
            text = file_content.decode('utf-8', errors='replace')
        except:
            text = ""
    
    # Always sanitize the extracted text
    return sanitize_text(text)

# Async versions for FastAPI compatibility
async def chunk_text_async(text: str, chunk_size: int = 400, overlap: int = 0) -> List[str]:
    """Async version of chunk_text for FastAPI compatibility."""
    return await asyncio.get_event_loop().run_in_executor(
        None, chunk_text, text, chunk_size, overlap
    )

async def create_embeddings_async(texts: List[str]) -> List[List[float]]:
    """Async version of create_embeddings for FastAPI compatibility."""
    return await asyncio.get_event_loop().run_in_executor(
        None, create_embeddings, texts
    )

async def extract_text_from_file_async(file_content: bytes, mime_type: str, file_name: str, config: Dict[str, Any] = None) -> str:
    """Async version of extract_text_from_file for FastAPI compatibility."""
    return await asyncio.get_event_loop().run_in_executor(
        None, extract_text_from_file, file_content, mime_type, file_name, config
    )

# Configuration helpers
def get_default_config() -> Dict[str, Any]:
    """Get default configuration that preserves original system behavior."""
    return {
        "supported_mime_types": [
            "application/pdf",
            "text/plain", 
            "text/html",
            "text/csv",
            "text/markdown",
            "text/x-markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.google-apps.document",
            "application/vnd.google-apps.spreadsheet",
            "application/vnd.google-apps.presentation"
        ],
        "export_mime_types": {
            "application/vnd.google-apps.document": "text/html",
            "application/vnd.google-apps.spreadsheet": "text/csv", 
            "application/vnd.google-apps.presentation": "text/html"
        },
        "text_processing": {
            "default_chunk_size": 400,  # NEVER CHANGE
            "default_chunk_overlap": 0   # NEVER CHANGE (0 = 20% overlap when properly calculated)
        }
    }

# ============================================================================
# ENHANCED MARKDOWN CONVERSION FUNCTIONS FOR HYPERLINK PRESERVATION
# ============================================================================

def is_text_based_pdf(file_content: bytes) -> bool:
    """
    Check if a PDF contains extractable text (not just images).
    
    Args:
        file_content: Binary content of the PDF file
        
    Returns:
        bool: True if PDF contains extractable text, False otherwise
    """
    if not MARKDOWN_CONVERSION_AVAILABLE:
        return True  # Fallback to assuming it's text-based
        
    try:
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
            temp_pdf.write(file_content)
            temp_pdf_path = temp_pdf.name
        
        with pdfplumber.open(temp_pdf_path) as pdf:
            if len(pdf.pages) == 0:
                os.remove(temp_pdf_path)
                return False
                
            # Check first few pages for text
            text_content = ""
            pages_to_check = min(3, len(pdf.pages))
            
            for i in range(pages_to_check):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text_content += page_text
            
            os.remove(temp_pdf_path)
            
            # If we have substantial text content, consider it text-based
            return len(text_content.strip()) > 100
            
    except Exception as e:
        print(f"Error checking PDF text content: {e}")
        return True  # Default to text-based for fallback

def convert_docx_to_markdown(file_content: bytes) -> str:
    """
    Convert DOCX file to markdown preserving hyperlinks using mammoth.
    CRITICAL: Images are filtered out to prevent vector corruption.
    
    Args:
        file_content: Binary content of the DOCX file
        
    Returns:
        Markdown text with preserved hyperlinks, images filtered out
    """
    if not MARKDOWN_CONVERSION_AVAILABLE:
        print("Markdown conversion libraries not available, falling back to original extraction")
        return None
        
    try:
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            temp_docx.write(file_content)
            temp_docx_path = temp_docx.name
        
        # Convert DOCX to HTML using mammoth (preserves hyperlinks)
        with open(temp_docx_path, "rb") as docx_file:
            # Use basic mammoth conversion - images will be converted to data URIs but we'll filter them in markdownify
            result = mammoth.convert_to_html(docx_file)
            html_content = result.value
            
            # Check for any conversion warnings
            if result.messages:
                print(f"Mammoth conversion warnings: {result.messages}")
        
        os.remove(temp_docx_path)
        
        if not html_content or len(html_content.strip()) < 50:
            return None
            
        # Convert HTML to Markdown using markdownify, stripping images to avoid base64 bloat
        import re
        # CRITICAL: Remove img tags with data: URIs to prevent base64 bloat and vector corruption
        clean_html = re.sub(r'<img[^>]*src="data:[^"]*"[^>]*>', '', html_content)
        
        markdown_content = markdownify.markdownify(
            clean_html, 
            heading_style="ATX",
            wrap=True,
            wrap_width=80,
            bullets="-",
            emphasis_mark="*",
            strong_mark="**"
        )
        
        return sanitize_text(markdown_content)
        
    except Exception as e:
        print(f"Error converting DOCX to markdown: {e}")
        return None

def convert_pdf_to_markdown(file_content: bytes) -> str:
    """
    Convert text-based PDF to markdown preserving hyperlinks using pdfplumber.
    
    Args:
        file_content: Binary content of the PDF file
        
    Returns:
        Markdown text with preserved hyperlinks
    """
    if not MARKDOWN_CONVERSION_AVAILABLE:
        print("Markdown conversion libraries not available, falling back to original extraction")
        return None
        
    try:
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
            temp_pdf.write(file_content)
            temp_pdf_path = temp_pdf.name
        
        text_parts = []
        links_found = []
        
        with pdfplumber.open(temp_pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract text
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
                
                # Extract hyperlinks (if available)
                try:
                    # pdfplumber can extract annotations which may include links
                    if hasattr(page, 'annots') and page.annots:
                        for annot in page.annots:
                            if annot.get('uri'):
                                uri = annot['uri']
                                # Try to find associated text
                                rect = annot.get('rect')
                                if rect:
                                    # This is a basic approach - full link text extraction is complex
                                    links_found.append(f"Link: {uri}")
                except Exception as link_e:
                    # Link extraction is optional, don't fail if it doesn't work
                    pass
        
        os.remove(temp_pdf_path)
        
        # Combine text and links
        all_text = ' '.join(text_parts)
        if links_found:
            all_text += '\n\n' + '\n'.join(links_found)
        
        if not all_text or len(all_text.strip()) < 50:
            return None
            
        return sanitize_text(all_text)
        
    except Exception as e:
        print(f"Error converting PDF to markdown: {e}")
        return None

def convert_to_markdown_with_links(file_content: bytes, mime_type: str, file_name: str) -> str:
    """
    Convert document files to markdown format preserving hyperlinks.
    
    Args:
        file_content: Binary content of the file
        mime_type: MIME type of the file
        file_name: Name of the file
        
    Returns:
        Markdown text with preserved hyperlinks, or None if conversion failed
    """
    if not MARKDOWN_CONVERSION_AVAILABLE:
        return None
    
    # Route to appropriate conversion function
    if mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or file_name.endswith('.docx'):
        return convert_docx_to_markdown(file_content)
    elif mime_type == 'application/pdf' or file_name.endswith('.pdf'):
        # Only convert text-based PDFs
        if is_text_based_pdf(file_content):
            return convert_pdf_to_markdown(file_content)
        else:
            print(f"PDF {file_name} appears to be image-based, using fallback extraction")
            return None
    elif mime_type == 'application/msword' or file_name.endswith('.doc'):
        # For now, fall back to original extraction for .doc files
        # Could be enhanced later to convert .doc to .docx first
        return None
    else:
        return None

def is_tabular_file(mime_type: str, config: Dict[str, Any] = None) -> bool:
    """
    Check if a file is tabular based on its MIME type.
    
    Args:
        mime_type: The MIME type of the file
        config: Optional configuration dictionary
        
    Returns:
        bool: True if the file is tabular (CSV or Excel), False otherwise
    """
    # Default tabular MIME types if config is not provided
    tabular_mime_types = [
        'csv',
        'xlsx',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.spreadsheet'
    ]
    
    # Use tabular_mime_types from config if available
    if config and 'tabular_mime_types' in config:
        tabular_mime_types = config['tabular_mime_types']
    
    return any(mime_type.startswith(t) for t in tabular_mime_types)