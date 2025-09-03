# RAG Tool Standalone - Typing Mind Plugin Setup Guide (FIXED)

## Overview

The RAG Tool Standalone plugin provides seamless integration between your standalone RAG pipeline and Typing Mind, enabling powerful semantic search across your Google Drive documents without complex database configuration.

## Features

✅ **Direct API Integration** - Connects to your RAG Tool Standalone server  
✅ **Two Search Modes** - Chunk search for specific info or full document retrieval  
✅ **Enhanced Processing** - Now includes image filtering and hyperlink preservation  
✅ **Template Detection** - Smart handling for template documents  
✅ **Real-time Results** - Search your live document index  

## Prerequisites

1. **RAG Tool Standalone** server running (typically at `localhost:8000`)
2. **Google Drive integration** active and processing documents
3. **Typing Mind** account with plugin support

## Installation Steps

### 1. Install the Plugin

1. Open Typing Mind and navigate to **Settings** → **Plugins**
2. Click **"Add Custom Plugin"** or **"Import Plugin"**
3. Copy the contents of `rag_tool_standalone_FIXED.json` 
4. Paste into the plugin editor
5. Click **"Save Plugin"**

### 2. Configure the Plugin

1. After installation, go to the plugin settings
2. Set the **RAG Tool API URL**:
   - **Local Development**: `http://localhost:8000` (default)
   - **Production/VPS**: Your server's full URL (e.g., `https://rag.yourcompany.com`)
   - **Different Port**: `http://localhost:3001` (if using custom port)

### 3. Verify Setup

Test the plugin with a simple query:

```
Query: "test search"
match_count: 5
include_full_document: false
```

You should see results from your indexed documents.

## Usage Examples

### Basic Search (Chunk Mode)
```
rag_tool_standalone({
  "query": "project requirements",
  "match_count": 10,
  "include_full_document": false
})
```

### Full Document Retrieval
```
rag_tool_standalone({
  "query": "partnership agreement template", 
  "match_count": 5,
  "include_full_document": true
})
```

### Comprehensive Search
```
rag_tool_standalone({
  "query": "meeting notes Q4 2024",
  "match_count": 25,
  "include_full_document": false
})
```

## Enhanced Features (v2)

### Image Filtering (FIXED)
- **Problem Solved**: Documents with images no longer corrupt vector embeddings
- **Implementation**: Images are filtered during DOCX/GDOC conversion to prevent base64 bloat
- **Benefit**: Better search quality and faster processing

### No Artificial Limits (FIXED)
- **Enhancement**: Removed 50-chunk limit for template files
- **Implementation**: `chunkLimit = allChunks.length` - retrieves ALL chunks
- **Benefit**: Complete document reconstruction regardless of file type or size

### Hyperlink Preservation  
- **Enhancement**: Links in documents are now preserved during processing
- **Supported Formats**: DOCX, Google Docs, HTML, Markdown
- **Output**: Links appear as "Link: [URL]" in search results

### Markdown Conversion
- **Improvement**: Documents converted to markdown for better text extraction
- **Benefits**: 
  - Preserves document structure
  - Maintains hyperlinks
  - Filters out image data
  - Better chunking results

## Troubleshooting

### No Search Results
1. **Check Server Status**: Visit `http://localhost:8000/health` 
2. **Verify Dashboard**: Ensure "Database: Connected" and "Google Drive: Connected"
3. **Document Count**: Check dashboard statistics for processed documents
4. **Google Drive**: Verify monitoring is active and files are being processed

### Connection Errors
1. **Server Running**: Ensure RAG Tool Standalone is running
2. **URL Configuration**: Verify the API URL in plugin settings
3. **Firewall**: Check if port 8000 (or your custom port) is accessible
4. **CORS**: Server allows requests from Typing Mind

### Plugin Not Working
1. **Plugin Installation**: Re-import the plugin JSON
2. **Settings**: Verify API URL configuration
3. **Browser Console**: Check for JavaScript errors
4. **Server Logs**: Check RAG Tool backend logs for errors

## API Reference

### Search Endpoint
- **URL**: `POST /api/search`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Parameters**:
  - `query` (string): Search query text
  - `limit` (integer): Number of results (1-50)

### Response Format
```json
{
  "query": "search query",
  "results": [
    {
      "id": 123,
      "content": "chunk content",
      "metadata": {
        "file_id": "drive_file_id",
        "file_title": "Document Name",
        "chunk_index": 1,
        "file_url": "https://drive.google.com/...",
        "last_modified": "2024-01-01T00:00:00Z"
      },
      "similarity": 0.85
    }
  ],
  "count": 10,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Performance Tips

1. **Match Count**: Start with 10 results, increase to 25-50 for comprehensive search
2. **Specific Queries**: Use specific terms for better semantic matching
3. **Full Documents**: Use sparingly for better performance
4. **Monitor Usage**: Check dashboard statistics regularly

## Security Notes

- Plugin connects directly to your RAG Tool server
- No external API keys required (OpenAI handled by server)
- All communication over HTTP/HTTPS
- Consider HTTPS for production deployments

## Support

- **Issues**: Check RAG Tool logs and dashboard status
- **Updates**: Plugin automatically uses latest server features  
- **Documentation**: Refer to RAG Tool Standalone documentation
- **Community**: Share feedback and improvements

---

**Last Updated**: September 2024  
**Plugin Version**: 2.0  
**Compatible With**: RAG Tool Standalone v1.0+