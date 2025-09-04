#!/bin/bash

# RAG Tool Standalone - Installation Script
# Single-command installer for easy deployment
# Usage: curl -fsSL https://raw.githubusercontent.com/your-org/RAG-Tool/main/install.sh | bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="rag-tool-standalone"
REPO_URL="https://raw.githubusercontent.com/stablemischief/RAG-Tool-brAIn/main"
GITHUB_REPO="https://api.github.com/repos/stablemischief/RAG-Tool-brAIn/contents"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BLUE}🚀 $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check for required commands
    local missing_commands=()
    
    if ! command_exists "docker"; then
        missing_commands+=("docker")
    fi
    
    if ! command_exists "docker-compose"; then
        missing_commands+=("docker-compose")
    fi
    
    if ! command_exists "curl"; then
        missing_commands+=("curl")
    fi
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log_error "Missing required commands: ${missing_commands[*]}"
        echo
        echo "Please install the missing prerequisites:"
        echo "• Docker Desktop: https://www.docker.com/products/docker-desktop/"
        echo "• curl: Usually pre-installed on most systems"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running"
        echo "Please start Docker Desktop and try again"
        exit 1
    fi
    
    # Check port availability
    local ports=(3000 8000 6379)
    for port in "${ports[@]}"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            log_warning "Port $port is already in use"
            echo "RAG Tool needs ports 3000 (frontend), 8000 (backend), and 6379 (redis)"
            echo "Please stop services using these ports or change the ports in docker-compose.yml"
        fi
    done
    
    # Check available disk space (need at least 2GB)
    local available_space=$(df . | tail -1 | awk '{print $4}')
    local required_space=2097152  # 2GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_warning "Low disk space detected"
        echo "RAG Tool requires at least 2GB of free disk space"
        echo "Available: $(( available_space / 1024 / 1024 ))GB"
    fi
    
    log_success "Prerequisites check completed"
}

# Create installation directory
create_install_directory() {
    log_step "Creating installation directory..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Directory '$INSTALL_DIR' already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Installation cancelled"
            exit 0
        fi
        rm -rf "$INSTALL_DIR"
    fi
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    log_success "Created directory: $INSTALL_DIR"
}

# Download template files
download_template_files() {
    log_step "Downloading template files..."
    
    # Create directory structure
    mkdir -p config sql logs data
    
    # Download core files
    local files=(
        "template/docker-compose.yml:docker-compose.yml"
        "template/.env.example:.env.example"  
        "template/setup.sh:setup.sh"
        "template/README.md:README.md"
    )
    
    for file_mapping in "${files[@]}"; do
        local source_file="${file_mapping%:*}"
        local dest_file="${file_mapping#*:}"
        
        log_info "Downloading $dest_file..."
        if curl -fsSL "$REPO_URL/$source_file" -o "$dest_file"; then
            log_success "Downloaded $dest_file"
        else
            log_error "Failed to download $dest_file"
            exit 1
        fi
    done
    
    # Download SQL files
    log_info "Downloading SQL setup files..."
    local sql_files=(
        "sql/00_setup_all.sql"
        "sql/01_enable_extensions.sql" 
        "sql/02_create_documents_table.sql"
        "sql/03_create_search_function.sql"
        "sql/04_create_metadata_tables.sql"
        "sql/05_create_admin_functions.sql"
    )
    
    for sql_file in "${sql_files[@]}"; do
        if curl -fsSL "$REPO_URL/$sql_file" -o "$sql_file"; then
            log_success "Downloaded $sql_file"
        else
            log_warning "Failed to download $sql_file (may not exist yet)"
        fi
    done
    
    # Make setup script executable
    chmod +x setup.sh
    
    log_success "Template files downloaded successfully"
}

# Show next steps
show_next_steps() {
    log_step "Installation completed successfully!"
    
    echo
    echo -e "${GREEN}🎉 RAG Tool Standalone is ready for configuration!${NC}"
    echo
    echo "Next steps:"
    echo "1. cd $INSTALL_DIR"
    echo "2. ./setup.sh    # Interactive configuration wizard"
    echo
    echo "What you'll need for setup:"
    echo "• OpenAI API key"
    echo "• Supabase project URL and service role key"
    echo "• Google service account JSON file"
    echo "• Google Drive folder ID"
    echo
    echo "The setup wizard will guide you through each step with validation."
    echo
    echo -e "📚 Documentation: ${BLUE}https://github.com/your-org/RAG-Tool${NC}"
    echo -e "💬 Support: ${BLUE}https://github.com/your-org/RAG-Tool/issues${NC}"
}

# Error handler
error_handler() {
    log_error "Installation failed on line $1"
    echo "Please check the error above and try again."
    echo "If you continue to have issues, please report them at:"
    echo "https://github.com/your-org/RAG-Tool/issues"
    exit 1
}

# Set error trap
trap 'error_handler $LINENO' ERR

# Main installation flow
main() {
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        RAG Tool Standalone           ║${NC}"
    echo -e "${BLUE}║     Single-Command Installer        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
    echo
    
    check_prerequisites
    create_install_directory  
    download_template_files
    show_next_steps
}

# Run main function
main "$@"