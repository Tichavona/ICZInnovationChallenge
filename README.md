# AI4I – Muyamuri / Umsizi Chatbot & Sovereign Data Platform

**AI for Impact Challenge 2026**  
*Artificial Intelligence for Maximum Social Impact and E‑Government Communication*

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Data Flow Summary](#data-flow-summary)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Optional Requirements](#optional-requirements)
- [Setup & Installation](#setup--installation)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend (RAG Backend)](#2-backend-rag-backend)
  - [3. Streamlit Interface](#3-streamlit-interface)
  - [4. Chatbot Frontend (React)](#4-chatbot-frontend-react)
  - [5. Chatbot Backend (Node.js)](#5-chatbot-backend-nodejs)
- [Environment Variables](#environment-variables)
  - [RAG Backend (.env)](#rag-backend-env)
  - [Streamlit Interface (.env)](#streamlit-interface-env)
  - [Chatbot Backend (.env)](#chatbot-backend-env)
  - [Chatbot Frontend (.env)](#chatbot-frontend-env)
- [Running the System](#running-the-system)
  - [Development Mode](#development-mode)
  - [Using Docker Compose (Production)](#using-docker-compose-production)
- [Testing](#testing)
  - [Python Tests](#python-tests-rag--streamlit)
  - [Node.js Tests](#nodejs-tests-chatbot)
  - [End-to-End Testing](#end-to-end-testing-cypress)
- [Deployment](#deployment)
  - [Production Checklist](#production-checklist)
  - [Cloud Deployment Options](#cloud-deployment-options)
- [Project Status](#project-status)
  - [✅ Completed Features](#-completed-features)
  - [🚧 In Development](#-in-development)
- [Key Features](#key-features)
  - [1. Emergency Reporting Module](#1-emergency-reporting-module)
  - [2. Municipal Services Module](#2-municipal-services-module)
  - [3. Agricultural Support Module](#3-agricultural-support-module)
  - [4. Government Communication Module](#4-government-communication-module)
  - [5. Data Sovereignty (Project Zvipo)](#5-data-sovereignty-project-zvipo)
- [Development Roadmap](#development-roadmap)
- [Contributing](#contributing)
  - [How to Contribute](#how-to-contribute)
  - [Development Standards](#development-standards)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Contact](#contact)
- [Documentation Index](#documentation-index)

---

## Overview

**Muyamuri/Umsizi** is an AI‑powered digital platform that revolutionises citizen‑government interaction across four critical domains: emergency response, municipal services, agricultural support, and official government communication. The platform leverages WhatsApp's ubiquitous presence, with over 12.83 million active internet subscriptions in Zimbabwe, to create a seamless, intelligent interface that receives citizen reports while proactively communicating official government positions with verifiable citations.

**Project Zvipo** (meaning "gifts" in Shona) extends the vision to build Zimbabwe's sovereign data foundation through public data aggregation, indigenous knowledge preservation, and the creation of Shona and Ndebele language corpora. The project addresses the critical data sovereignty gap by establishing a Sovereign Data Curation Pipeline that systematically scrapes and structures public government data while creating a first‑of‑its‑kind indigenous tree knowledge dataset.

### This repository consolidates three main components:

| **Component** | **Technology** | **Purpose** |
|---|---|---|
| **RAG Backend** | Python 3.10.13, FastAPI, LLM | Document retrieval, embeddings, and LLM inference with Retrieval-Augmented Generation |
| **Streamlit Interface** | Python 3.10.13, Streamlit | Web dashboard for government officials to monitor and update reports |
| **Chatbot** | Node.js v24.18.0, React, Express | WhatsApp integration, frontend admin UI, and backend API services |

---

## System Architecture

<img width="1672" height="941" alt="System Architecture" src="https://github.com/user-attachments/assets/a28c757a-71c4-4939-9feb-53178822c418" />
                                                                                                                               
---

# Data Flow Summary

| **Step** | **Actor** | **Action** | **Destination** |
|---|---|---|---|
| 1 | Citizens | Send WhatsApp messages (text, image, audio, video, location, documents) | Chatbot Backend |
| 2 | Chatbot Backend | Process messages, classify intent, extract entities | RAG Backend |
| 3 | RAG Backend | Retrieve relevant documents, generate responses with citations | Chatbot Backend |
| 4 | Chatbot Backend | Send responses back to citizens via WhatsApp | WhatsApp API |
| 5 | RAG Backend | Store reports and interactions in MongoDB | MongoDB Database |
| 6 | Streamlit Dashboard | Display reports to government officials | Streamlit Web UI |
| 7 | Government Officials | Action reports (assign, update, resolve) | Streamlit Web UI |
| 8 | Chatbot Backend | Send status updates to citizens via WhatsApp | WhatsApp API |
| 9 | React Admin UI | System administrators manage users, departments, and configurations | React Web UI |

---

## Folder Structure

<img width="941" height="1672" alt="Folder Structure" src="https://github.com/user-attachments/assets/58a86a0e-0dbf-4639-9679-7c7e6ef2ec61" />

---

## Prerequisites

| **Requirement** | **Version** | **Purpose** |
|---|---|---|
| **Git** | Latest | Version control |
| **Python** | **3.10.13** | RAG Backend & Streamlit Interface |
| **Node.js** | **v24.18.0** | Chatbot Frontend & Backend |
| **npm** | v24.18.0+ | Node.js package manager |
| **MongoDB** | 6.0+ | Primary database (or cloud instance like Atlas) |
| **Pinecone / Qdrant** | Latest | Vector database for embeddings |
| **WhatsApp Business API** | - | WhatsApp integration credentials |

---

## Optional Requirements

| **Requirement** | **Purpose** |
|---|---|
| **Docker** | Containerised deployment |
| **Docker Compose** | Multi-container orchestration |
| **Redis** | Caching (optional) |
| **AWS/Azure/GCP** | Cloud hosting |
| **Nginx** | Reverse proxy |
| **Prometheus/Grafana** | Monitoring and observability |
| **ELK Stack** | Centralised logging |

---

## Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Tichavona/AI4I.git
cd AI4I
```

### 2. Backend (RAG Backend)
Navigate to the RAG backend:

```bash
cd rag-backend/RAG-main
Create and activate a virtual environment (Python 3.10.13):
```

bash
#### Windows
```
python -m venv venv
venv\Scripts\activate
```

#### Linux/Mac
```
python3.10 -m venv venv
source venv/bin/activate
```

Install dependencies:

bash
```
pip install -r requirements.txt
```

Copy environment template:

bash
#### Windows
```
copy .env.example .env
```

#### Linux/Mac
```
cp .env.example .env
Configure .env (see Environment Variables).
```

Start the RAG server:

bash
```
python app.py
Or using Uvicorn (recommended for development):
```

bash
```
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
The RAG server will run at http://localhost:8000.
```

### 3. Streamlit Interface
Navigate to the Streamlit directory:

bash
```
cd ../../streamlit-interface
Create and activate a virtual environment (Python 3.10.13):
```

bash
#### Windows
```
python -m venv venv
venv\Scripts\activate
```

#### Linux/Mac
```
python3.10 -m venv venv
source venv/bin/activate
```
Install dependencies:

bash
```
pip install -r requirements.txt
Copy environment template:
```

bash
#### Windows
```
copy .env.example .env
```

#### Linux/Mac
```cp .env.example .env
Configure .env (see Environment Variables).
```

Run the Streamlit dashboard:

bash
```
streamlit run app.py
```
The dashboard will be available at http://localhost:8501.

### 4. Chatbot Frontend (React)
Navigate to the React frontend:

bash
```
cd ../chatbot/chatbot-frontend
```
Install dependencies (Node.js v24.18.0):

bash
```
npm install
```
Copy environment template:

bash
#### Windows
```
copy .env.example .env
```

#### Linux/Mac
```
cp .env.example .env
```
Configure .env (see Environment Variables).

Start the development server:

bash
```
npm start
```
The React app will be available at http://localhost:3000.

Build for production (optional):

bash
```
npm run build
```
### 5. Chatbot Backend (Node.js)
Navigate to the chatbot backend:

bash
```
cd ../yamurai-chatbot
```
Install dependencies (Node.js v24.18.0):

bash
```
npm install
```
Copy environment template:

bash
#### Windows
```
copy .env.example .env
```

#### Linux/Mac
```
cp .env.example .env
```
Configure .env (see Environment Variables).

Start the server:

bash
```
npm start
```
For development with auto-reload:

bash
```
npm run dev
```
The chatbot backend will run at http://localhost:5000.

---

## Environment Variables
Each component expects a .env file in its respective root directory. Below are all required variables.

### RAG Backend (.env)
env
#### MongoDB Configuration
```
MONGO_URI=mongodb://localhost:27017/rag_db
MONGO_DB_NAME=rag_db
```

#### Vector Database
```
VECTOR_DB_TYPE=pinecone  # or qdrant
VECTOR_DB_API_KEY=your_pinecone_or_qdrant_key
VECTOR_DB_ENVIRONMENT=your_environment
VECTOR_DB_INDEX_NAME=your_index_name
```

#### LLM Configuration
```
LLM_PROVIDER=openai  # or azure, local
LLM_API_KEY=your_openai_or_azure_key
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
```

#### Document Store
```
DOCUMENT_STORE_PATH=./data/documents
EMBEDDINGS_CACHE_PATH=./data/embeddings
```

#### Server Configuration
```
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

#### Logging
```
LOG_LEVEL=INFO
LOG_FILE=./logs/rag.log
```

#### Rate Limiting
```
RATE_LIMIT_PER_MINUTE=60
```

### Streamlit Interface (.env)
env
#### API URLs
```
RAG_API_URL=http://localhost:8000
CHATBOT_API_URL=http://localhost:5000
```

#### MongoDB
```
MONGO_URI=mongodb://localhost:27017/streamlit_db
MONGO_DB_NAME=streamlit_db
```

#### Authentication (optional)
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_hashed_password
```

#### Session
```
SESSION_TIMEOUT=3600  # seconds
```

#### Analytics
```
ENABLE_ANALYTICS=True
ANALYTICS_REFRESH_INTERVAL=60  # seconds
```

#### Logging
```
LOG_LEVEL=INFO
```

### Chatbot Backend (.env)
env
#### Server Configuration
```
PORT=5000
NODE_ENV=development
```

#### WhatsApp Business API
```
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_API_VERSION=v18.0
```

#### MongoDB
```
MONGO_URI=mongodb://localhost:27017/chatbot_db
MONGO_DB_NAME=chatbot_db
```

#### RAG Integration
```
RAG_API_URL=http://localhost:8000
```

#### Security
```
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret
```

#### Rate Limiting
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Logging
```
LOG_LEVEL=info
LOG_FILE=./logs/chatbot.log
```

#### Webhook
```
WEBHOOK_BASE_URL=https://your-domain.com
WEBHOOK_PATH=/webhook
```
### Chatbot Frontend (.env)

env
#### API URLs
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_RAG_API_URL=http://localhost:8000
```

#### Authentication
```
REACT_APP_AUTH_ENABLED=true
```

#### Feature Flags
```
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true
```
#### Build
```
REACT_APP_BUILD_VERSION=1.0.0
```
---

## Running the System
### Development Mode
Start the services in the following order:

Step	Service	Command	Port	URL
1	RAG Backend	python app.py	8000	http://localhost:8000
2	Streamlit Dashboard	streamlit run app.py	8501	http://localhost:8501
3	Chatbot Backend	npm run dev	5000	http://localhost:5000
4	Chatbot Frontend	npm start	3000	http://localhost:3000

### Using Docker Compose (Production)
Create a docker-compose.yml in the root directory (sample below) and run:

bash
```
docker-compose up -d
Sample docker-compose.yml
```
yaml
```
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: ai4i_mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your_password

  rag-backend:
    build: ./rag-backend/RAG-main
    container_name: ai4i_rag
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/rag_db
    depends_on:
      - mongodb
    volumes:
      - ./rag-backend/RAG-main:/app
      - rag_data:/app/data

  streamlit:
    build: ./streamlit-interface
    container_name: ai4i_streamlit
    ports:
      - "8501:8501"
    environment:
      - RAG_API_URL=http://rag-backend:8000
      - MONGO_URI=mongodb://mongodb:27017/streamlit_db
    depends_on:
      - mongodb
      - rag-backend

  chatbot-backend:
    build: ./chatbot/yamurai-chatbot
    container_name: ai4i_chatbot
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/chatbot_db
      - RAG_API_URL=http://rag-backend:8000
    depends_on:
      - mongodb
      - rag-backend

  chatbot-frontend:
    build: ./chatbot/chatbot-frontend
    container_name: ai4i_frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://chatbot-backend:5000
    depends_on:
      - chatbot-backend

volumes:
  mongodb_data:
  rag_data:
```
---

## Testing

### Python Tests (RAG & Streamlit)

bash

#### RAG backend
```
cd rag-backend/RAG-main
pytest tests/ --cov=app --cov-report=html
```

#### Streamlit
```
cd streamlit-interface
pytest tests/
```

### Node.js Tests (Chatbot)
bash
#### Backend

```
cd chatbot/yamurai-chatbot
npm test -- --coverage
```

#### Frontend
```
cd chatbot/chatbot-frontend
npm test
```

### End-to-End Testing (Cypress)
bash
```
npm install -g cypress
cypress run
```

---
## Deployment
### Production Checklist
```
Set NODE_ENV=production in Node.js services
Set DEBUG=False in Python services
Use a production MongoDB (Atlas or dedicated server)
Configure SSL/TLS certificates for HTTPS
Set up a reverse proxy (nginx) in front of services
Implement monitoring (Prometheus, Grafana)
Schedule regular backups
Configure centralised logging (ELK Stack)
Set up rate limiting and DDoS protection
Configure firewall and security groups
Implement CI/CD pipeline
```

### Cloud Deployment Options
```
Provider	Services
AWS	ECS or EC2 with RDS for MongoDB, SageMaker for LLM, S3 for storage
Azure	Azure Container Instances, Cosmos DB, Azure OpenAI
GCP	Cloud Run, Firestore, Vertex AI
```

---

## Project Status
### ✅ Completed Features

| Component | Status | Description |
|---|---|---|
| WhatsApp Integration | ✅ Complete | Bidirectional messaging with full media support (text, images, audio, video, location, documents) |
| NLP Engine | ✅ Complete | Intent classification, entity recognition, sentiment analysis |
| LLM with RAG | ✅ Complete | Custom fine‑tuned model on Zimbabwean government documents |
| Multimodal Processing | ✅ Complete | Support for text, image, audio, video, location, and documents |
| Document Parsing | ✅ Complete | PDF, Excel, Word, CSV with OCR capability |
| Data Storage | ✅ Complete | MongoDB with encryption‑ready columns and hashed phone numbers |
| Emergency Reporting | ✅ Complete | Collection, triage, and routing of emergency reports |
| Municipal Services | ✅ Complete | Infrastructure issue reporting with tracking |
| Agricultural Support | ✅ Complete | Crop disease, pest, animal invasion reporting |
| Government Communication | ✅ Complete | AI‑powered Q&A with document citations |
| Data Scraping | ✅ Complete | Zimpapers publications proof‑of‑concept |
| Shona/Ndebele Processing | ✅ Complete | Basic language detection and processing |
| ZCHPC CCE Readiness | ✅ Complete | Deployment architecture configured |

### 🚧 In Development
| Component | Status | Description |
|---|---|---|
| Stakeholder Dashboards | 🚧 In Progress | Emergency, municipal, agricultural, admin dashboards |
| Spatial Analytics | 🚧 In Progress | Geospatial clustering for disease/pest prevalence mapping |
| Full Multilingual Support | 🚧 In Progress | Complete Shona and Ndebele language models |
| Indigenous Tree Dataset | 📋 Planned | Field expeditions and community interviews |

---
## Key Features
### 1. Emergency Reporting Module
- Automated triage of emergencies (fire, medical, crime, accidents, disasters)
- GPS location integration for rapid response
- Priority‑based dispatch system
- Real‑time status updates to citizens

### 2. Municipal Services Module
- Image and location‑based issue reporting (potholes, waste, water systems)
- Automated routing to relevant departments
- Citizen feedback and satisfaction tracking
- Performance analytics for municipal authorities

### 3. Agricultural Support Module
- AI‑assisted crop disease diagnosis via image analysis
- Pest control and crop protection advice
- Animal invasion reporting to National Parks
- Spatial analytics for disease/pest prevalence and invasion hotspots
- Agricultural best practices and market information

### 4. Government Communication Module
- Intelligent Q&A System with LLM‑powered responses
- Document Reference Engine with automatic page‑level citations
- Policy Update Broadcast for new regulations and announcements
- Multilingual Support (English, Shona, Ndebele)
- Source Verification with document references

### 5. Data Sovereignty (Project Zvipo)
- Public Data Aggregation and Harmonisation
- Indigenous Tree Knowledge Dataset
- Shona and Ndebele Language Corpora
- Sovereign Data Platform with API endpoints

---
## Development Roadmap

### Phase	Timeline	Deliverables
- Phase 1: Core Platform	Months 1‑3	Emergency reporting, government communication, WhatsApp integration
- Phase 2: Full Integration	Months 4‑6	Municipal services, agricultural support, spatial analytics
- Phase 3: National Scale‑up	Months 7‑12	National rollout, multilingual support, advanced analytics
- Phase 4: Advanced Features	Months 13‑18	Mobile app, blockchain integration, predictive analytics
---

## Contributing
We welcome contributions! Please follow these guidelines.

### How to Contribute
- Fork the repository.
- Create a feature branch: git checkout -b feature/your-feature
- Commit your changes: git commit -m "Add: your feature"
- Push to the branch: git push origin feature/your-feature
- Open a Pull Request.

### Development Standards
- Python: Follow PEP 8.
- JavaScript/TypeScript: Follow Airbnb style guide.
- Documentation: Update README and comments accordingly.
- Testing: Ensure all tests pass.
- Security: Never commit .env or other sensitive data.
---

## License
This project is proprietary and confidential. All rights reserved. Copyright © 2026 Decision Edge Consulting (Private) Limited Team.
Unauthorised copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without prior written permission from the authors. For licensing inquiries, please contact: sales@decisionedge.co

## Acknowledgements
- POTRAZ – Postal and Telecommunications Regulatory Authority of Zimbabwe
- National Innovation Acceleration Centre – Programme support
- AI4I Challenge 2026 – Platform for innovation and impact

---

## Contact
| Role	| Contact |
|---|---|
|Project Lead	| tvakisai@decisionedge.co.zw |
|Technical Support | info@decisionedge.co |

---
## Documentation Index
| Document	| Location |
|---|---|
| API Documentation |	./docs/API.md |
| Database Schema	| ./docs/DATABASE.md |
| Deployment Guide	| ./docs/DEPLOYMENT.md |
| User Manual	| ./docs/USER_MANUAL.md |
| Contributing Guide	| ./CONTRIBUTING.md |
| Security Policy	| ./SECURITY.md |
| Changelog	| ./CHANGELOG.md |
---
Built with ❤️ in Zimbabwe, "Nyika inovakwa nevene vayo"
