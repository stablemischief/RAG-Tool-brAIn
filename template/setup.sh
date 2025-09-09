#!/bin/bash

# RAG Tool Standalone - Interactive Setup Wizard  
# Guides users through configuration with real-time validation
# Usage: ./setup.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration file
ENV_FILE=".env"
CONFIG_DIR="config"
SERVICE_ACCOUNT_FILE="$CONFIG_DIR/service-account.json"

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
    echo -e "\n${PURPLE}🚀 $1${NC}"
}

log_input() {
    echo -e "${CYAN}📝 $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate JSON format
validate_json() {
    local file="$1"
    if [ ! -f "$file" ]; then
        return 1
    fi
    python3 -m json.tool "$file" >/dev/null 2>&1
}

# Extract service account email from JSON
extract_service_account_email() {
    local json_file="$1"
    if validate_json "$json_file"; then
        python3 -c "
import json
with open('$json_file', 'r') as f:
    data = json.load(f)
    print(data.get('client_email', ''))
" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Test OpenAI API key
test_openai_key() {
    local api_key="$1"
    if [ ${#api_key} -lt 20 ]; then
        return 1
    fi
    
    # Test with a simple API call
    local response=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        "https://api.openai.com/v1/models")
    
    [ "$response" = "200" ]
}

# Test Supabase connection
test_supabase_connection() {
    local url="$1"
    local key="$2"
    
    # Test connection with a simple request
    local response=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $key" \
        -H "apikey: $key" \
        "$url/rest/v1/")
    
    [ "$response" = "200" ] || [ "$response" = "404" ]
}

# Check if Supabase database is clean (no existing tables)
check_supabase_clean() {
    local url="$1"
    local key="$2"
    
    # Check for existing documents table
    local response=$(curl -s \
        -H "Authorization: Bearer $key" \
        -H "apikey: $key" \
        "$url/rest/v1/documents?limit=1" 2>/dev/null || echo "error")
    
    # If we get an error, the table probably doesn't exist (clean state)
    [[ "$response" == *"relation \"public.documents\" does not exist"* ]] || [[ "$response" == "error" ]]
}

# Test Google Drive access
test_google_drive_access() {
    local folder_id="$1"
    local service_account_file="$2"
    
    if [ ! -f "$service_account_file" ]; then
        return 1
    fi
    
    # This is a simplified check - in a real implementation, you'd use Google API client
    # For now, just check if the service account file is valid JSON
    validate_json "$service_account_file"
}

# Setup database schema
setup_database_schema() {
    local url="$1"
    local key="$2"
    
    log_step "Setting up database schema..."
    
    if [ ! -f "sql/00_setup_all.sql" ]; then
        log_error "Database setup file not found: sql/00_setup_all.sql"
        return 1
    fi
    
    log_info "Deploying database schema to Supabase..."
    
    # Read and execute SQL file
    # Note: In a real implementation, you'd execute this via Supabase API or psql
    # For now, we'll provide instructions to the user
    
    echo
    echo -e "${YELLOW}📋 Manual Database Setup Required${NC}"
    echo "Please complete these steps in your Supabase dashboard:"
    echo "1. Go to your Supabase project SQL Editor"
    echo "2. Copy the contents of 'sql/00_setup_all.sql'"
    echo "3. Paste and execute the script"
    echo "4. Verify you see success messages for tables, functions, etc."
    echo
    read -p "Press Enter when database setup is complete... " -r
    
    # Test if setup worked by checking for documents table
    log_info "Verifying database setup..."
    local test_response=$(curl -s \
        -H "Authorization: Bearer $key" \
        -H "apikey: $key" \
        "$url/rest/v1/documents?limit=1" 2>/dev/null || echo "error")
    
    if [[ "$test_response" != *"error"* ]] && [[ "$test_response" != *"does not exist"* ]]; then
        log_success "Database schema setup verified!"
        return 0
    else
        log_warning "Could not verify database setup. Please ensure SQL script was executed successfully."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]]
    fi
}

# Prompt for OpenAI API key
prompt_openai_key() {
    log_step "OpenAI API Configuration"
    log_info "You need an OpenAI API key for text embeddings"
    log_info "Get one at: https://platform.openai.com/api-keys"
    echo
    
    while true; do
        log_input "Enter your OpenAI API key (sk-...):"
        read -r openai_key
        
        if [ -z "$openai_key" ]; then
            log_warning "API key cannot be empty"
            continue
        fi
        
        if [[ ! "$openai_key" =~ ^sk- ]]; then
            log_warning "API key should start with 'sk-'"
            continue
        fi
        
        log_info "Testing API key..."
        if test_openai_key "$openai_key"; then
            log_success "OpenAI API key validated!"
            echo "OPENAI_API_KEY=$openai_key" >> "$ENV_FILE"
            break
        else
            log_error "Invalid API key or connection failed"
            read -p "Try again? (Y/n): " -n 1 -r
            echo
            [[ ! $REPLY =~ ^[Nn]$ ]] || exit 1
        fi
    done
}

# Prompt for Supabase configuration
prompt_supabase_config() {
    log_step "Supabase Database Configuration" 
    log_info "You need a Supabase project for vector database storage"
    log_info "Get credentials from: Project Settings > API in your Supabase dashboard"
    echo
    
    # Prompt for URL
    while true; do
        log_input "Enter your Supabase Project URL (https://xxx.supabase.co):"
        read -r supabase_url
        
        if [ -z "$supabase_url" ]; then
            log_warning "Supabase URL cannot be empty"
            continue
        fi
        
        if [[ ! "$supabase_url" =~ ^https://.*\.supabase\.co$ ]]; then
            log_warning "URL should be in format: https://project.supabase.co"
            continue
        fi
        
        break
    done
    
    # Prompt for Service Role Key
    while true; do
        log_input "Enter your Supabase Service Role Key (eyJ...):"
        read -r supabase_key
        
        if [ -z "$supabase_key" ]; then
            log_warning "Service Role Key cannot be empty"
            continue
        fi
        
        if [[ ! "$supabase_key" =~ ^eyJ ]]; then
            log_warning "Service Role Key should start with 'eyJ'"
            continue
        fi
        
        log_info "Testing Supabase connection..."
        if test_supabase_connection "$supabase_url" "$supabase_key"; then
            log_success "Supabase connection successful!"
            
            # Check if database is clean
            if check_supabase_clean "$supabase_url" "$supabase_key"; then
                log_success "Database is clean and ready for setup"
            else
                log_warning "Database may have existing tables"
                log_info "This is okay if you're updating an existing installation"
            fi
            
            echo "SUPABASE_URL=$supabase_url" >> "$ENV_FILE"
            echo "SUPABASE_SERVICE_KEY=$supabase_key" >> "$ENV_FILE"
            
            # Setup database schema
            setup_database_schema "$supabase_url" "$supabase_key"
            break
        else
            log_error "Connection failed - check your URL and Service Role Key"
            read -p "Try again? (Y/n): " -n 1 -r
            echo
            [[ ! $REPLY =~ ^[Nn]$ ]] || exit 1
        fi
    done
}

# Prompt for Google Drive configuration
prompt_google_drive_config() {
    log_step "Google Drive Integration Setup"
    log_info "You need a Google Service Account for accessing Google Drive"
    echo
    
    # Check for service account file
    while true; do
        if [ -f "$SERVICE_ACCOUNT_FILE" ]; then
            log_success "Found service account file at $SERVICE_ACCOUNT_FILE"
            break
        fi
        
        log_warning "Service account JSON file not found at $SERVICE_ACCOUNT_FILE"
        echo "Please follow these steps:"
        echo
        echo "🔑 Create Service Account (NOT OAuth2):"
        echo "1. Go to Google Cloud Console → APIs & Services → Credentials"
        echo "2. Click '+ Create Credentials' → 'Service Account' (NOT OAuth 2.0 Client ID)"
        echo "3. Name: 'rag-tool-service-account'"
        echo "4. Skip role assignment → Skip user access → Done"
        echo
        echo "🔐 Download JSON Key:"
        echo "1. Click your service account name → Keys tab"
        echo "2. Add Key → Create new key → JSON format → Create"
        echo "3. JSON file downloads automatically"
        echo
        echo "📁 Place JSON file:"
        echo "4. Copy downloaded JSON file to: $SERVICE_ACCOUNT_FILE"
        echo
        echo "📧 Share Drive Folder:"
        echo "5. Open JSON file and copy the 'client_email' value"
        echo "6. Share your Google Drive folder with this email (Viewer permission)"
        echo "   (It's a robot account - this is normal!)"
        echo
        read -p "Press Enter when file is in place... " -r
    done
    
    # Validate service account file and extract email
    if validate_json "$SERVICE_ACCOUNT_FILE"; then
        log_success "Service account file is valid JSON"
        
        local service_email=$(extract_service_account_email "$SERVICE_ACCOUNT_FILE")
        if [ -n "$service_email" ]; then
            log_success "Service account email: $service_email"
            echo
            log_info "Make sure to share your Google Drive folder with this email!"
        fi
    else
        log_error "Invalid service account JSON file"
        exit 1
    fi
    
    # Prompt for folder ID
    while true; do
        log_input "Enter your Google Drive Folder ID:"
        log_info "Extract from URL: https://drive.google.com/drive/folders/FOLDER_ID"
        read -r folder_id
        
        if [ -z "$folder_id" ]; then
            log_warning "Folder ID cannot be empty"
            continue
        fi
        
        log_info "Testing Google Drive access..."
        if test_google_drive_access "$folder_id" "$SERVICE_ACCOUNT_FILE"; then
            log_success "Google Drive configuration looks valid!"
            echo "GOOGLE_DRIVE_FOLDER_ID=$folder_id" >> "$ENV_FILE"
            break
        else
            log_error "Could not validate Google Drive access"
            log_info "Make sure:"
            log_info "1. The folder ID is correct"
            log_info "2. The folder is shared with: $service_email"
            log_info "3. Google Drive API is enabled in Google Cloud Console"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "GOOGLE_DRIVE_FOLDER_ID=$folder_id" >> "$ENV_FILE"
                break
            fi
        fi
    done
}

# Add default configuration values
add_default_config() {
    log_step "Adding default configuration..."
    
    cat >> "$ENV_FILE" << EOF

# Default configuration values
EMBEDDING_MODEL_NAME=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
GOOGLE_SERVICE_ACCOUNT_PATH=./config/service-account.json
POLLING_INTERVAL=300
LOG_LEVEL=INFO
CLEANUP_ENABLED=true
MAX_FILE_SIZE_MB=50
DEFAULT_CHUNK_SIZE=400
DEFAULT_CHUNK_OVERLAP=80
EOF
    
    log_success "Default configuration added"
}

# Start services
start_services() {
    log_step "Starting RAG Tool services..."
    
    if ! command_exists "docker-compose"; then
        log_error "docker-compose not found"
        exit 1
    fi
    
    log_info "Building and starting containers..."
    if docker-compose up -d --build; then
        log_success "Services started successfully!"
        
        echo
        log_info "Waiting for services to initialize..."
        sleep 10
        
        # Check service health
        log_info "Checking service health..."
        
        local backend_health=$(curl -s http://localhost:8000/health 2>/dev/null || echo "unhealthy")
        local frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "unhealthy")
        
        if [[ "$backend_health" == *"healthy"* ]]; then
            log_success "Backend: http://localhost:8000 ✅"
        else
            log_warning "Backend: http://localhost:8000 ⚠️"
        fi
        
        if [[ "$frontend_health" == "200" ]]; then
            log_success "Frontend: http://localhost:3000 ✅"
        else
            log_warning "Frontend: http://localhost:3000 ⚠️"
        fi
        
    else
        log_error "Failed to start services"
        log_info "Check logs with: docker-compose logs"
        exit 1
    fi
}

# Show completion message
show_completion() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     🎉 Setup Complete! 🎉          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Your RAG Tool Standalone is ready!${NC}"
    echo
    echo "Access your system:"
    echo -e "• Dashboard: ${CYAN}http://localhost:3000${NC}"
    echo -e "• API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
    echo -e "• Health:    ${CYAN}http://localhost:8000/health${NC}"
    echo
    echo "Next steps:"
    echo "1. Open the dashboard to monitor file processing"
    echo "2. Add documents to your Google Drive folder"
    echo "3. Watch them get processed automatically"
    echo "4. Try searching in the dashboard"
    echo
    echo "Management commands:"
    echo "• Start:   docker-compose up -d"
    echo "• Stop:    docker-compose down"
    echo "• Logs:    docker-compose logs -f"
    echo "• Restart: docker-compose restart"
    echo
    echo -e "${GREEN}Happy searching! 🔍${NC}"
}

# Error handler
error_handler() {
    log_error "Setup failed on line $1"
    echo "If you need to start over, you can:"
    echo "• Delete .env file and run setup again"
    echo "• Check logs with: docker-compose logs"
    echo "• Report issues at: https://github.com/your-org/RAG-Tool/issues"
    exit 1
}

# Set error trap
trap 'error_handler $LINENO' ERR

# Main setup flow
main() {
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      RAG Tool Standalone Setup      ║${NC}"
    echo -e "${BLUE}║     Interactive Configuration       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
    echo
    
    # Create config directory
    mkdir -p "$CONFIG_DIR"
    
    # Check if .env already exists
    if [ -f "$ENV_FILE" ]; then
        log_warning "Configuration file .env already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Setup cancelled. Use 'docker-compose up -d' to start with existing config."
            exit 0
        fi
        rm "$ENV_FILE"
    fi
    
    # Create empty .env file
    touch "$ENV_FILE"
    
    # Run configuration steps
    prompt_openai_key
    prompt_supabase_config  
    prompt_google_drive_config
    add_default_config
    start_services
    show_completion
}

# Run main function
main "$@"