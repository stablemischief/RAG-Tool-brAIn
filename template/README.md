# RAG Tool Standalone - User Installation

**Your personal RAG pipeline is almost ready!**

You have successfully installed the RAG Tool Standalone template. This directory contains everything you need to run your own semantic search system powered by Google Drive and OpenAI.

## 🚀 Quick Start

### 1. Run Interactive Setup
```bash
./setup.sh
```

This will guide you through:
- ✅ Configuring your API keys and database
- ✅ Setting up Google Drive integration  
- ✅ Testing all connections
- ✅ Deploying the database schema
- ✅ Starting all services

### 2. Access Your System
After setup completes:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📋 What You Need Before Setup

### Required Information
1. **OpenAI API Key**
   - Get one at: https://platform.openai.com/api-keys
   - Format: `sk-...`

2. **Supabase Project Credentials**
   - Project URL: `https://your-project.supabase.co`
   - Service Role Key: `eyJ...` (long JWT token)
   - Get from: Project Settings > API in your Supabase dashboard

3. **Google Service Account JSON File**
   - Downloaded from Google Cloud Console
   - Place at: `./config/service-account.json`

4. **Google Drive Folder ID**
   - From folder URL: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Extract: `FOLDER_ID` part

### Preparation Steps

#### Google Drive Setup
1. **Create/Choose Folder**: Select the Google Drive folder you want to monitor
2. **Share Folder**: Share it with your service account email (found in the JSON file)
3. **Set Permission**: Give the service account "Viewer" access
4. **Copy Folder ID**: Extract from the folder URL

#### Supabase Setup  
1. **Create Project**: Sign up at https://supabase.com and create a new project
2. **Get Credentials**: Go to Settings > API and copy URL + Service Role Key
3. **Ensure Clean State**: Your project should have no existing tables

## 📁 Directory Structure

```
rag-tool-standalone/
├── setup.sh              # Interactive configuration wizard
├── docker-compose.yml    # Container orchestration  
├── .env.example          # Environment template
├── .env                  # Your configuration (created by setup)
├── config/
│   └── service-account.json  # Google service account (you provide)
├── sql/                  # Database setup files
├── logs/                 # Runtime logs
└── data/                 # Persistent data
```

## 🛠️ Manual Configuration (Alternative)

If you prefer manual setup:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit with your values
nano .env  # or your preferred editor

# 3. Place service account file
cp /path/to/your-service-account.json config/service-account.json

# 4. Start services
docker-compose up --build
```

## 🔍 Troubleshooting

### Common Issues

**Service Account Authentication Failed**
- Verify the JSON file is at `./config/service-account.json`
- Check that Google Drive API is enabled in Google Cloud Console
- Ensure the Drive folder is shared with your service account email

**Database Connection Failed**  
- Verify your Supabase URL and Service Role Key
- Check that your Supabase project is not paused
- Ensure you're using the Service Role Key, not the anon key

**Docker Issues**
- Make sure Docker Desktop is running
- Check that ports 3000, 8000, and 6379 are available
- Try `docker-compose down && docker-compose up --build`

### Getting Help

1. **Check logs**: `docker-compose logs [service-name]`
2. **Health check**: Visit http://localhost:8000/health
3. **Dashboard**: Check status at http://localhost:3000  
4. **Issues**: Report at https://github.com/your-org/RAG-Tool/issues

## 🎯 Success Indicators

After setup, you should see:
- ✅ All containers running (3 green in Docker Desktop)
- ✅ Dashboard shows "Database: Connected" 
- ✅ Dashboard shows "Google Drive: Connected"
- ✅ Files in your Drive folder start processing automatically
- ✅ Search works in the dashboard or via API

## 📖 Next Steps

1. **Test with sample files**: Add a few documents to your monitored folder
2. **Try searching**: Use the dashboard or Typing Mind plugin
3. **Monitor processing**: Watch the real-time activity feed
4. **Explore API**: Visit http://localhost:8000/docs for full API documentation

---

**Welcome to RAG Tool Standalone!** 🎉  
Your documents are about to become searchable knowledge.

Need help? Run `./setup.sh` again to reconfigure any settings.