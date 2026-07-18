# ''' Enhanced Version for App Integration
#     Tichavona Vakisai - Deep Analytics Senior Data Scientist
#     11/10/2024 17:17Hrs
#     Multimodal zbGPT Customer Insights Dashbaord
#     Data Sources - PDFs, Internal Databases, Freshdesk, Freshcaller, Schools National Database
#     Version 1
#     Technologies - Python, Flask, Streamlit, JavaScripts, Node js, Ollama, Llama 3.2, Oracle Linux 9.3, SQL Server. Json

#     This defines the Flask backend application for the zbGPT RAG. Information can be scrapped from PDFs, presentations, Excel Sheets,
#     Comma Separated Vlaues (CSV) files, databases, audio and video if in english. The backend uses Rest API technology to pass 
#     information from front end to backend and relaying response back to frontend.

#     We have included the requirements files to define prerequisite packages for the application, but also included a pip freeze files
#     specifying the environment packages at current runtime and app production. Kindly go through the README file to understand how to
#     set up the application. 
# '''

# # Importations

# from langchain_community.llms import Ollama as modelO
# from flask import Flask, request, jsonify, send_file
# from werkzeug.utils import safe_join
# from langchain.text_splitter import RecursiveCharacterTextSplitter as rcts
# from langchain_community.embeddings.fastembed import FastEmbedEmbeddings as fee
# from langchain_community.vectorstores import Chroma
# from langchain.schema import Document
# from langchain.chains.combine_documents import create_stuff_documents_chain as csdc
# from langchain.chains import create_retrieval_chain as crc
# from langchain.prompts import PromptTemplate as pt
# from docx import Document as DocxDocument
# from langchain.docstore.document import Document
# import pandas as pd
# from pptx import Presentation
# import os
# from pydantic import ValidationError
# from agents.internetAgent import internet_required, search_internet  # Import from internetAgent.py
# from datetime import datetime
# import re
# from glob import glob as gb
# import shutil
# import ollama
# import platform
# import pytesseract
# from typing import Any
# from unstructured.partition.pdf import partition_pdf
# from pdf2image import convert_from_path
# from PIL import Image
# import cv2
# import numpy as np
# from pathlib import Path
# import mimetypes

# # Set the path to the Tesseract executable and directories
# if platform.system() == "Windows":   
#     print("In windows") 
#     pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
#     poppler_path = r'C:\Program Files\poppler-24.08.0\Library\bin'

#     #Paths
#     base_dir = "C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/"
#     output_path = r'C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\output'
#     os.makedirs(output_path, exist_ok=True)
#     figures_path = r'C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\figures'

# elif platform.system() == "Linux":
#     pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

#     # Paths
#     base_dir = "/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/"
#     output_path = '/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/output'
#     os.makedirs(output_path, exist_ok=True)
#     figures_path = '/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/figures'

# app = Flask(__name__)

# pattern = r'^\d{8}_[A-Za-z]{3}_[A-Za-z]{3}_[A-Za-z]{3}_\d{2}'
# clspattern = r'^\d{8}_[A-Za-z]{3}_cls_[A-Za-z]{3}_[A-Za-z]{1}\d{1}'


# def is_valid_newspaper_filename(pattern, fileName):
#     if re.match(pattern, fileName):
#         return True
#     return False

# # Function to check for duplicate chunkTitle
# def chunk_exists(chunks, chunk_title):
#     return any(chunk['metadata']['chunkTitle'] == chunk_title for chunk in chunks)

# llm = modelO(
#     model="gpt-oss:20b",
#     temperature = 0.0
#     )

# def generate_embeddings(text_chunks, model_name = 'nomic-embed-text:latest'):
#     embeddings = []
#     for chunk in text_chunks:
#         embedding = ollama.embeddings(model=model_name, prompt=chunk)
#         embeddings.append(embedding)
#     return embeddings

# try:            
#     embedding = fee()  
# except ValidationError as e:
#     print(f"Failed to load FastEmbedEmbeddings due to validation error: {e}")
#     print("Trying to manually download the model...")

#     from langchain.embeddings.openai import OpenAIEmbeddings
#     embedding = OpenAIEmbeddings()  

# text_splitter = rcts(
#     chunk_size=7500,
#     chunk_overlap=1875,
#     length_function=len,
#     is_separator_regex='\n'
# )

# # Defining the dynamic prompt template
# def tempCreation(temp, query):
#     template = f"""
#     <s>
#         [INST]
#             You are an intelligent AI system equipped with access to a comprehensive knowledge base consisting of:

#             - Public archives of newspaper, radio, and television articles (Zimpapers).
#             - Internal databases of the user's organization.
#             - Private document uploads linked to the user.

#             You assist journalists, researchers, and everyday users in retrieving relevant information from the following sources. You are also
#             adept at handling general queries posed by users. Your responses must be informative, structured, and always present a positive 
#             image of the organization, the President of Zimbabwe, his cabinet, and the country of Zimbabwe. You should also correct negative 
#             perceptions with a polite and constructive tone.

#             When responding to queries, choose the appropriate response type:

#             1. **Zimpapers Archive**: Respond using articles from Zimpapers (newspapers, radio, TV), organized by metadata.
#             2. **Internal Database**: Respond using internal company documents based on user-specific requests.
#             3. **User's Uploaded Documents**: Retrieve data from personal document uploads and vector stores specific to the user.
#             4. **General Questions**: Provide answers to general questions and offer spelling correction suggestions where necessary.

#             ### Additional context for Zimpapers and its operations:
#             The printing and broadcasting house has one television network called Zimpapers Television Network (ZTN) which started broadcasting 
#             on 7 October 2017, and also started broadcasting as a free-to-air TV channel known as ZTN Prime on DSTV Channel 294 on 24 May 2022 
#             at 17:30 Hours. It also has several radio stations, including one commercial radio station in Harare (Start FM) and regional stations 
#             like Diamond FM (Mutare), Nyaminyami FM (Kariba), and Capitalk 100.4 FM (Harare). 

#             On the print side, Zimpapers owns multiple publications with varied frequencies. Below is a summary of key publications:
#                 1. **B-Metro**, Bulawayo, Founded: 2010, Language: English, Frequency: Daily
#                 2. **Bridal Magazine**, Harare, Founded: 2011, Language: English, Frequency: Biannual
#                 3. **Business Weekly**, Harare, Founded: 2017, Language: English, Frequency: Weekly
#                 4. **The Chronicle**, Bulawayo, Founded: 1894, Language: English, Frequency: Daily
#                 5. **H-Metro**, Harare, Founded: 2009, Language: English, Frequency: Daily
#                 6. **The Herald**, Harare, Founded: 1891, Language: English, Frequency: Daily
#                 7. **Kwayedza**, Harare, Founded: 1986, Language: Shona, Frequency: Weekly
#                 8. **The Manica Post**, Mutare, Founded: 1893, Language: English, Frequency: Weekly
#                 9. **The Southern Times**, Windhoek, Founded: 2004, Language: English, Frequency: Weekly
#                 10. **Suburban**, Harare, Founded: 2016, Language: English, Frequency: Weekly
#                 11. **The Sunday Mail**, Harare, Founded: 1935, Language: English, Frequency: Weekly
#                 12. **The Sunday News**, Bulawayo, Founded: 1930, Language: English, Frequency: Weekly
#                 13. **uMthunywa**, Bulawayo, Founded: 2004, Language: Ndebele, Frequency: Weekly
#                 14. **Zimtravel**, Harare, Founded: 2003, Language: English, Frequency: Monthly

#             Here is how you should structure your responses:

#             {temp}

#             Remember:
#             - Always maintain a respectful tone and positively affirm Zimbabwe, its leadership, and the organization.
#             - When context is insufficient, inform the user and offer alternative suggestions or general knowledge.

#             Generate responses based on the following user query: {query}
#         [/INST]
#     </s>
#     """

#     return template

# def generate_prompt_with_dict(organisation, query):
#     source_type = organisation
    
#     if source_type == "Zimpapers":
#         temp = """
#                 ### When retrieving articles from Zimpapers Knowledge Centre:
#                 - **Publication Title**: metadata "publicationTitle" which is the newspaper publication title line Sunday Mail, The Herald etc
#                 - **Date**: metadata "date" which is the date the newspaper title was published
#                 - **Page**: metadata "page" which is the page number the article is found on
#                 - **Chunk Title**: metadata "chunkTitle" which is the title of the chunk in the vector store
#                 - **Paper Section**: metadata "paperSection" which is the section of the newspaper title the article is contained
#                 - **Location**: metadata "location" which is information about where the newspaper title is based
#                 - **Text**: metadata "text" which is text for the chunk in the vector store
#                 - **Image Available**: 'Yes' if has_image else 'No'
#             """
#     elif source_type == "csAssistant":
#         temp = """
#                 ### When retrieving articles from Customer Service Assistant Vector Store:
#                 You are an intelligent and friendly customer service assistant with access to a comprehensive knowledge base 
#                 that includes:
                
#                 FAQs, product manuals, service agreements, and customer support database.

#                 Your task is to provide factual, clear, and helpful responses to customer inquiries.
#                 Ensure polite greeting, core identification of the query, and useful suggestions.
#                 Use this format when assisting customers:

#                 Greeting: "Hello! How can I assist you today?"
#                 Inquiry: The customer query.
#                 Response: Useful information from the knowledge base, steps or guidance.
#                 Closing: "Is there anything else I can assist you with? Have a great day!"
#             """
#     elif source_type == "zimpapersPL":
#         temp = """
#                 ### When retrieving internal documents:
#                 - **Publication Title**: The title of the document from the metadata.
#                 - **Chunk Title**: The title of the chunk in the vector store.
#                 - **Page**: The page number the chunk is found from in the document.
#                 - **Summary**: The chunk text summary.
#             """
#     else:
#         temp = """
#                 ### When retrieving from user-uploaded documents:
#                 - **Publication Title**: The title of the document contained in the metadata.
#                 - **Chunk Title**: The title of the chunk in the vector store.
#                 - **Page**: The page number the chunk is found from in the document.
#                 - **Summary**: The chunk text summary.
#             """
#     template = tempCreation(temp, query)
#     completeTemplate = f"""
#     <System>
#         {template}
#     </System>
#     """
#     return completeTemplate

# completeTemp = f""" <s>[INST] You are an AI chatbot having a conversation with a human. Answer his questions factually and truthfully
#  based on the context provided. if you do not the answer, just say so and do not make up answers not in the context provided."""

# def promptMaking(completeTemplate):
#     # Combine system prompt with input and context
#     prompt = completeTemplate + """
# [INST] 
#     input: {input}
#     Context: {context}
#     Answer:
# [/INST]
#     """
    
#     rawPrompt = pt.from_template(prompt)
    
#     return rawPrompt

# class Document:
#     def __init__(self, text, metadata=None):
#         self.page_content = text
#         self.metadata = metadata or {}

# # Unified endpoint that handles both cases
# @app.route("/query", methods=['POST'])
# def unified_query():
#     """Unified endpoint that routes to either AI or DB query based on organisation"""
#     try:
#         json_content = request.json
#         organisation = json_content.get("organisation")
#         print(organisation)
        
#         if organisation and organisation.strip():
#             return dbQuery()
#         else:
#             return aiChatbotPost()
#     except Exception as e:
#         print(f"Error in unified_query: {str(e)}")
#         return jsonify({
#             "answer": "Sorry, an error occurred while processing your request.",
#             "sources": [],
#             "source_count": 0,
#             "organisation": "error"
#         }), 500

# # WhatsApp webhook endpoint
# @app.route('/whatsapp/webhook', methods=['GET', 'POST'])
# def whatsapp_webhook():
#     # Verification for GET requests (WhatsApp webhook verification)
#     if request.method == 'GET':
#         mode = request.args.get('hub.mode')
#         token = request.args.get('hub.verify_token')
#         challenge = request.args.get('hub.challenge')
        
#         verification_token = os.environ.get('WHATSAPP_VERIFICATION_TOKEN', 'default-token')
        
#         if mode == 'subscribe' and token == verification_token:
#             return challenge, 200
#         else:
#             return 'Verification failed', 403
    
#     # Handle POST requests (incoming messages)
#     elif request.method == 'POST':
#         try:
#             data = request.get_json()
#             # Process the WhatsApp message here
#             print("Received WhatsApp webhook:", data)
            
#             # Extract message content from WhatsApp webhook format
#             messages = data.get('entry', [{}])[0].get('changes', [{}])[0].get('value', {}).get('messages', [])
            
#             if messages:
#                 message = messages[0]
#                 if message.get('type') == 'text':
#                     text = message.get('text', {}).get('body', '')
#                     from_number = message.get('from', '')
                    
#                     print(f"Message from {from_number}: {text}")

#                     response = unified_query()
                    
#                     # Process the message - you can call your AI endpoints here
#                     # For example:
#                     # response = process_whatsapp_message(text, from_number)
                    
#                     return jsonify({"status": "success", "message": response}), 200
            
#             return jsonify({"status": "success", "message": "No text message found"}), 200
            
#         except Exception as e:
#             print("Error processing webhook:", e)
#             return jsonify({"error": str(e)}), 500

# # Health check endpoint
# @app.route('/health', methods=['GET'])
# def health_check():
#     # Verify API key if you want authentication
#     api_key = request.headers.get('X-API-Key')
#     expected_api_key = os.environ.get('FLASK_API_KEY', 'default-secret-key')
    
#     if api_key != expected_api_key:
#         return jsonify({"error": "Unauthorized"}), 401
    
#     return jsonify({
#         "status": "healthy",
#         "timestamp": datetime.now().isoformat(),
#         "service": "Flask LLM Backend",
#         "version": "1.0",
#         "endpoints": {
#             "/ai": "Basic AI queries (POST)",
#             "/dbQuerying": "Organisation-specific queries (POST)",
#             "/query": "Unified query endpoint (POST)",
#             "/health": "Health check (GET)",
#             "/whatsapp/webhook": "WhatsApp webhook (GET/POST)"
#         }
#     })

# @app.route('/download/<path:filename>', methods=['GET'])
# def download_source_file(filename):
#     """Download a source file from any of the upload directories"""
#     try:
#         # Verify API key
#         api_key = request.headers.get('X-API-Key')
#         expected_api_key = os.environ.get('FLASK_API_KEY', 'default-secret-key')
        
#         if api_key != expected_api_key:
#             return jsonify({"error": "Unauthorized"}), 401
        
#         # Define all possible upload directories
#         upload_dirs = [
#             f"{base_dir}pdfUploads",
#             f"{base_dir}wordUploads",
#             f"{base_dir}excelUploads",
#             f"{base_dir}powerpointUploads",
#             f"{base_dir}tempUploads"
#         ]
        
#         # Try to find the file in any of the directories
#         for directory in upload_dirs:
#             file_path = Path(directory) / filename
#             if file_path.exists():
#                 # Get file size
#                 file_size = file_path.stat().st_size
                
#                 # Get mime type
#                 mime_type, _ = mimetypes.guess_type(str(file_path))
#                 if not mime_type:
#                     # Default based on extension
#                     ext = file_path.suffix.lower()
#                     mime_map = {
#                         '.pdf': 'application/pdf',
#                         '.doc': 'application/msword',
#                         '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
#                         '.xls': 'application/vnd.ms-excel',
#                         '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
#                         '.ppt': 'application/vnd.ms-powerpoint',
#                         '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
#                         '.txt': 'text/plain',
#                         '.csv': 'text/csv',
#                         '.jpg': 'image/jpeg',
#                         '.jpeg': 'image/jpeg',
#                         '.png': 'image/png',
#                     }
#                     mime_type = mime_map.get(ext, 'application/octet-stream')
                
#                 # Add file size to response headers
#                 response = send_file(
#                     file_path,
#                     as_attachment=True,
#                     download_name=filename,
#                     mimetype=mime_type
#                 )
                
#                 # Add file size header
#                 response.headers['X-File-Size'] = str(file_size)
                
#                 return response
        
#         # If file not found in any directory
#         return jsonify({"error": "File not found"}), 404
        
#     except Exception as e:
#         print(f"Error downloading file {filename}: {e}")
#         return jsonify({"error": str(e)}), 500

# # Add endpoint to get file info without downloading
# @app.route('/file-info/<path:filename>', methods=['GET'])
# def get_file_info(filename):
#     """Get file information without downloading"""
#     try:
#         # Verify API key
#         api_key = request.headers.get('X-API-Key')
#         expected_api_key = os.environ.get('FLASK_API_KEY', 'default-secret-key')
        
#         if api_key != expected_api_key:
#             return jsonify({"error": "Unauthorized"}), 401
        
#         # Define all possible upload directories
#         upload_dirs = [
#             f"{base_dir}pdfUploads",
#             f"{base_dir}wordUploads",
#             f"{base_dir}excelUploads",
#             f"{base_dir}powerpointUploads",
#             f"{base_dir}tempUploads"
#         ]
        
#         # Try to find the file in any of the directories
#         for directory in upload_dirs:
#             file_path = Path(directory) / filename
#             if file_path.exists():
#                 file_size = file_path.stat().st_size
#                 file_ext = file_path.suffix.lower()
                
#                 return jsonify({
#                     "filename": filename,
#                     "size": file_size,
#                     "extension": file_ext,
#                     "exists": True,
#                     "download_url": f"/download/{filename}"
#                 })
        
#         return jsonify({
#             "filename": filename,
#             "exists": False
#         }), 404
        
#     except Exception as e:
#         print(f"Error getting file info for {filename}: {e}")
#         return jsonify({"error": str(e)}), 500

# @app.route('/<path:filename>', methods=['GET'])
# def download_file( filename):
#     """Legacy download endpoint - redirects to the new endpoint"""
#     return download_source_file(filename)

# @app.route("/ai", methods=['POST'])
# def aiPost():
#     print('Post /ai called')
#     json_content = request.json
#     query = json_content.get("query")
#     print(f'query: {query}')

#     response = llm.invoke(query)
#     print(response)

#     # Check if the response is relevant
#     if "I do not have enough information" in response or "I cannot answer" in response:
#         responseAnswer = {"response": "The information provided is insufficient to answer your query accurately."}
#     else:
#         responseAnswer = {"response": response}

#     return jsonify(responseAnswer)

# @app.route("/aiChatbot", methods=['POST'])
# def aiChatbotPost():
#     print('Post /aiChatbot called')
#     json_content = request.json
#     query = json_content.get("query")
#     print(f'query: {query}')

#     response = llm.invoke(query)
#     print(response)

#     # Return consistent format with other endpoints
#     if "I do not have enough information" in response or "I cannot answer" in response:
#         response_answer = "The information provided is insufficient to answer your query accurately."
#     else:
#         response_answer = response

#     # Return the same format as dbQuerying for consistency
#     return jsonify({
#         "answer": response_answer, 
#         "sources": [],
#         "source_count": 0,
#         "organisation": "general"
#     })

# @app.route("/dbQuerying", methods=['POST'])
# def dbQuery(base_dir = base_dir):
#     json_content = request.json
#     organisation = json_content.get("organisation")
#     query = json_content.get("query")
#     customPrompt = json_content.get('prompt')

#     # Get the base URL for downloads
#     base_url = request.host_url.rstrip('/')

#      # If no organisation provided, redirect to basic AI endpoint
#     if not organisation or not organisation.strip():
#         return aiPost()

#     # Set database directories based on the organisation
#     if organisation == "Zimpapers":
#         dbDirectory = f"{base_dir}knowledgeCentreDB"
#     elif organisation == "csAssistant":
#         dbDirectory = f"{base_dir}csAssistantDB"
#     elif organisation == "zimpapersPL":
#         dbDirectory = f"{base_dir}policiesDB"
#     else:
#         dbDirectory = f"{base_dir}{organisation}"
    
#     completeTemplate = generate_prompt_with_dict(organisation, query)
#     rawPrompt = promptMaking(completeTemplate)
    
#     print(f'Post /Querying documents in {organisation} database')

#     # Load Vectorstore database
#     vectorStore = Chroma(persist_directory=dbDirectory, embedding_function=embedding)

#     # Creating retriever option with refined settings
#     retriever = vectorStore.as_retriever(
#         search_type="similarity_score_threshold",
#         search_kwargs={
#             "k": 10,
#             "score_threshold": 0.5  # Stricter threshold
#         }
#     )

#     # Set up document chain and retrieval system
#     documentChain = csdc(llm, rawPrompt)
#     chain = crc(retriever, documentChain)

#     # Run the query through the chain
#     input = query
#     result = chain.invoke({"input": input})

#     # Extract clean answer by removing <think> content
#     answer = extract_final_answer(result['answer'])

#     # Collect sources with metadata from the result
#     sources = []
#     for doc in result.get('context', []):
#         if 'source' in doc.metadata:
#             source_path = doc.metadata['source']
#             filename = Path(source_path).name

#             # Create download URL
#             download_url = f"{base_url}/download/{filename}"

#             sources.append({
#                 'source': filename,
#                 'Page number': doc.metadata.get('page', 'N/A'),
#                 "Page Content": doc.page_content[:500] + "...",
#                 'full_path': source_path,
#                 'document_type': Path(source_path).suffix,
#                 'download_available': True,
#                 'download_url': download_url  # Add the download URL
#             })
        
#     print(sources)

#     # Return the response with answer and sources
#     response = {"answer": answer, "sources": sources, "source_count": len(sources), "organisation": organisation}
#     return jsonify(response)

# def extract_final_answer(ai_response):
#     """
#     Extract the final answer by removing content within <think> tags.
#     Returns everything after the </think> tag.
#     """
#     if not ai_response:
#         return ai_response
    
#     # # Method 1: Simple split
#     # if '</think>' in ai_response:
#     #     parts = ai_response.split('</think>', 1)
#     #     return parts[1].strip() if len(parts) > 1 else parts[0].strip()
    
#     # Method 2: Regex for more complex cases
#     think_pattern = r'<think>.*?</think>\s*(.*)'
#     match = re.search(think_pattern, ai_response, re.DOTALL)
#     if match:
#         return match.group(1).strip()
    
#     # Return original if no think tags found
#     return ai_response.strip()

# def move_and_rename_files(source_folder, destination_folder, new_name_prefix):
#     # Ensure the destination folder exists
#     os.makedirs(destination_folder, exist_ok=True)

#     # Get a list of files in the source folder
#     files = list(Path(source_folder).glob('*.jpg'))

#     filenames, file_paths = [], []

#     for file_path in files:
#         filename = file_path.stem
        
#         # Create a new file name with a prefix and index
#         new_filename = f"{new_name_prefix}_{filename}.jpg"
        
#         # Define the new file path in the destination folder
#         new_file_path = os.path.join(destination_folder, new_filename)

#         # Move and rename the file
#         shutil.move(file_path, new_file_path)
        
#         print(f"Moved and renamed '{filename}' to '{new_file_path}'")
#         filenames.append(new_filename)
#         file_paths.append(new_file_path)
    
#     return filenames, file_paths

# # Securely join paths to prevent directory traversal attacks
# def secure_join(directory, filename):
#     filepath = os.path.join(directory, filename)
#     if os.path.commonprefix([os.path.abspath(filepath), os.path.abspath(directory)]) != os.path.abspath(directory):
#         return None
#     return filepath

# # Preprocess text function
# def clean_text(text):
#     cleaned = re.sub(r'\(cid:\d+\)', '', text)
#     return cleaned

# def check_folder(folder_path):
#     # Check if the folder exists
#     if os.path.exists(folder_path) and os.path.isdir(folder_path):
#         return 200
#     else:
#         return 404
    
# def add_metadata(chunks, fileName):
#     print(fileName)
#     metadataDict = {
#         "SUN":"SUNDAY MAIL",
#         "BRI":"BRIDGE",
#         "HAR":"HARARE",
#         "BUS":"BUSINESS",
#         "CLS":"CLASSIFIEDS",
#         "EXT":"EXTRA",
#         "JOB":"JOB CENTRE",
#         "LEI":"LEISURE",
#         "MAI":"MAIN",
#         "POS":"POSTER",
#         "REL":"RELIGION",
#         "SUP":"SUPPLEMENTARY IMAGES",
#         "SPC":"SUPPLEMENTARY"
#     }

#     locationDict = {
#         "HAR":"HARARE",
#         "BYO":"BULAWAYO",
#         "MRE":"MUTARE"
#     }

#     file_components = fileName.split('_')
#     if len(file_components) in [5, 6]:
#         publicationTitle = metadataDict[file_components[1].upper()]
#         paperSection = metadataDict[file_components[2].upper()]
#         page = file_components[4].split(".")[0]
#         date = file_components[0]
#         location = locationDict[file_components[3].upper()]
#         subsection = metadataDict[file_components[5].split(".")[0].upper()] if len(file_components) == 6 else ''
#     else:
#         return []
    
#     metadata_chunks = []
#     i = 1    
#     for chunk in chunks:
#         # Create custom metadata
#         custom_metadata = {
#             "publicationTitle": publicationTitle,
#             "chunkNumber": str(i),
#             "chunkTitle": f'{fileName.split(".")[0]}{str(page)}{str(i)}',
#             "paperSection": paperSection,
#             "date": datetime.strptime(date, "%Y%m%d").strftime('%Y-%m-%d'),
#             "location": location,
#             "subsection": subsection,
#             "dateAdded": datetime.today().strftime('%Y-%m-%d'),
#             "page":page
#         }
#         # Update chunk's existing metadata with custom metadata (without overwriting)
#         chunk.metadata.update(custom_metadata)
            
#         # Append the chunk with updated metadata
#         metadata_chunks.append(chunk)
                
#         i += 1
    
#     return metadata_chunks

# def chunking(docs, file):
#     metadata_chunks = []
#     file = os.path.basename(file)
    
#     if file.split(".")[-1] == 'pdf':
#         directory = 'pdfUploads'
#     elif 'doc' in file.split(".")[-1]:
#         directory = 'wordUploads'
#     elif 'xls' in file.split(".")[-1]:
#         directory = 'excelUploads'
#     else:
#         directory = 'powerpointUploads'

#     for doc in docs:
#         chunks = text_splitter.split_documents([doc])
#         page_number = doc.metadata.get('page', None)
#         i = 1
#         base = f'/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/{directory}/'
#         for chunk in chunks:
#             # Create custom metadata
#             custom_metadata = {
#                 "publicationTitle": file,
#                 "chunkNumber": str(i),
#                 "chunkTitle": f'{file.split(".")[0]}{str(page_number)}{str(i)}',
#                 "paperSection": "",
#                 "date": datetime.today().strftime('%Y-%m-%d'),
#                 "location": "",
#                 "subsection": "",
#                 "dateAdded": datetime.today().strftime('%Y-%m-%d'),
#                 "source": ''.join([base,file])
#             }
            
#             # Update chunk's existing metadata with custom metadata (without overwriting)
#             chunk.metadata.update(custom_metadata)
            
#             # Append the chunk with updated metadata
#             metadata_chunks.append(chunk)

#             i += 1  # Increment chunk number

#     return metadata_chunks

# def fileSaving(save_directory, saveFile, tempDirectory):
#     # Define the destination folder
#     destination_folder = os.path.join(save_directory)

#     # Make sure the destination folder exists
#     os.makedirs(destination_folder, exist_ok=True)

#     # Move the file
#     shutil.move(saveFile, destination_folder)

#     # Save the file
#     tempfolderDelete(tempDirectory)

# def tempfolderDelete(tempDirectory):
#     # Save the file
#     if os.path.exists(tempDirectory):
#         shutil.rmtree(tempDirectory)

# # Function to check if two chunks are equal based on 'text' and 'metadata'
# def chunks_equal(list1, list2):
#     existentChunks, metadata_chunks = [], []
#     if len(list1) == len(list2):
#         i = 0
#         while i < len(list1):
#             if (list1[i].page_content == list2[i].page_content) and (list1[i].metadata == list1[i].metadata):
#                 existentChunks.append(list1[i].metadata['chunkTitle'])
#             else:
#                 metadata_chunks.append(list1[i])
#             i += 1
#     return metadata_chunks, existentChunks

# def pdfChunker(pdf_path, figures_path):
#     pdf_path = Path(pdf_path)
    
#     document_name = pdf_path.stem 
#     print(f"Processing file: {document_name}")

#     # Convert PDF pages to images for OCR
#     if platform.system() == "Windows":
#         pages = convert_from_path(pdf_path, 300, poppler_path=poppler_path)
#     elif platform.system() == "Linux":
#         pages = convert_from_path(pdf_path, 300)
#     extracted_text = []
#     image_annotations = ''
#     docs =[]

#     # Extract unstructured text with OCR
#     for page_num, page in enumerate(pages):
#         open_cv_image = np.array(page)[:, :, ::-1].copy()
#         gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
#         _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
#         text = pytesseract.image_to_string(Image.fromarray(thresh))
#         extracted_text.append(text)#clean_text(text))

#     # Combine extracted text from OCR
#     final_extracted_content = "\n".join(extracted_text)

#     if platform.system() == "Linux":
#         # Use partition_pdf to extract images and structured elements
#         raw_pdf_elements = partition_pdf(
#             filename=str(pdf_path),
#             extract_images_in_pdf=True,
#             infer_table_structure=True,
#             chunking_strategy='by_title',
#             max_characters=4000,
#             new_after_n_chars=3800,
#             combine_text_under_n_chars=2000,
#             image_output_dir=output_path
#         )

#         checkMeasure = check_folder(figures_path)

#         # Process and annotate each extracted image
#         # for index, element in enumerate(raw_pdf_elements):
#         if checkMeasure == 200:
#             imageNames, imagePaths = move_and_rename_files(figures_path, output_path, document_name)

#             for i in range(len(imageNames)):

#                 #image_caption = getattr(element.metadata, 'title', 'Image')  # Extract title as caption if available
#                 image_output_filename = imageNames[i]
#                 image_output_path = imagePaths[i]

#                 # Add image annotation to the text
#                 annotation = f"Image: {image_output_filename} - {image_output_path}\n"
#                 image_annotations += f"{annotation} | "

#                 # Insert annotation in text content
#                 final_extracted_content += f"\n{annotation}\n"

#     # Create a Document object
#     document = Document(
#         text=final_extracted_content,
#         metadata={
#             "document_name": document_name,
#             "image_annotations": image_annotations.rstrip(" | "),
#             "source": str(pdf_path)
#         }
#     )

#     docs.append(document)
        
#     return docs, len(pages)

# def Uploads(fileObject, base_dir = base_dir):
#     if 'file' not in fileObject:
#         return None, {"Status": "No files found in the request"}, 400
    
#     files = fileObject.getlist('file')

#     if not files or all(file.filename == '' for file in files):
#         return None, {"Status": "No files selected"}, 400

#     responses = []
#     final_chunks = dict()

#     for file in files:
#         try:
#             fileName = "_".join(file.filename.lower().split()).replace("-", "_").replace("+", "_").replace("__", "_")
#             # print(f"First file name: {fileName}")
#             # if len(fileName.split("+")) > 0:
#             #     fileName = str(fileName).replace("+", "_")
#             # elif len(fileName.split()) > 0:
#             #     fileName = "_".join(str(fileName).split())
#             # elif len(fileName.split("-")) > 0:
#             #     fileName = str(fileName).replace("-", "_")
#             # else:
#             #     fileName = "_".join(str(fileName).split())
#             # print(f"Final file name: {fileName}")

#             file_extension = fileName.split('.')[-1]

#             save_directory = {
#                 'pdf': f"{base_dir}pdfUploads",
#                 'doc': f"{base_dir}wordUploads",
#                 'docx': f"{base_dir}wordUploads",
#                 'xls': f"{base_dir}excelUploads",
#                 'xlsx': f"{base_dir}excelUploads",
#                 'ppt': f"{base_dir}powerpointUploads",
#                 'pptx': f"{base_dir}powerpointUploads"
#             }.get(file_extension)

#             if save_directory is None:
#                 responses.append({
#                     "Status": "Unsupported file type",
#                     "File name": fileName
#                 })
#                 continue

#             tempDirectory = f"{base_dir}tempUploads"

#             if not os.path.exists(tempDirectory):
#                 os.makedirs(tempDirectory)

#             saveFile = '/'.join([tempDirectory, fileName])
#             # Save the file
#             file.save(saveFile)

#             # Variables to store document chunks and comparison results
#             docs = []
#             compaDocs = []
#             num_pages_or_sheets = 0

#             if platform.system() == "Windows":
#                 # Retrieve lists of previously uploaded files for comparison
#                 fileListPDF = gb(os.path.join(r'.\CorporateGPT2\pdfUploads', '*.pdf'))
#                 fileListword = gb(os.path.join(r'.\CorporateGPT2\wordUploads', '*.doc*'))
#                 fileListExcel = gb(os.path.join(r'.\CorporateGPT2\excelUploads', '*.xls*'))
#                 fileListPPT = gb(os.path.join(r'.\CorporateGPT2\powerpointUploads', '*.ppt*'))

#             elif platform.system() == "Linux":
#                 # Retrieve lists of previously uploaded files for comparison
#                 fileListPDF = list(Path(f"{base_dir}pdfUploads").glob('*.pdf'))
#                 fileListword = list(Path(f"{base_dir}wordUploads").glob('*.doc*'))
#                 fileListExcel = list(Path(f"{base_dir}excelUploads").glob('*.xls*'))
#                 fileListPPT = list(Path(f"{base_dir}powerpointUploads").glob('*.ppt*'))

#             # Store previously uploaded filenames for easy comparison
#             pdfFileNames = [Path(i).name for i in fileListPDF]
#             wordFileNames = [Path(i).name for i in fileListword]
#             excelFileNames = [Path(i).name for i in fileListExcel]
#             pptFileNames = [Path(i).name for i in fileListPPT]

#             # File processing based on extension
#             #PDF Files Processing
#             if file_extension == 'pdf':
#                 if fileName in pdfFileNames:
#                     path = f"{base_dir}pdfUploads"
#                     compaFile = '/'.join([path, fileName])
#                     docs, num_pages_or_sheets = pdfChunker(saveFile, figures_path)
#                     compaDocs, _ = pdfChunker(compaFile, figures_path)
#                 else:
#                     docs, num_pages_or_sheets = pdfChunker(saveFile, figures_path)

#             # Word files processing
#             elif file_extension in ['doc', 'docx']:
#                 if fileName in wordFileNames:
#                     path = f'{base_dir}wordUploads'
#                     compaFile = os.path.join(path, fileName)
#                     doc = DocxDocument(saveFile)
#                     docs = [Document(p.text) for p in doc.paragraphs if p.text.strip()]
#                     doc = DocxDocument(compaFile)
#                     compaDocs = [Document(p.text) for p in doc.paragraphs if p.text.strip()]
#                     num_pages_or_sheets = len(docs)
#                 else:
#                     doc = DocxDocument(saveFile)
#                     docs = [Document(p.text) for p in doc.paragraphs if p.text.strip()]
#                     num_pages_or_sheets = len(docs)

#             # Excel files processing
#             elif file_extension in ['xls', 'xlsx']:
#                 if fileName in excelFileNames:
#                     path = f'{base_dir}excelUploads'
#                     compaFile = os.path.join(path, fileName)
#                     excel = pd.ExcelFile(saveFile)
#                     for sheet_name in excel.sheet_names:
#                         sheet_df = pd.read_excel(excel, sheet_name=sheet_name)
#                         docs.append(Document(sheet_df.to_string()))
#                     excel = pd.ExcelFile(compaFile)
#                     for sheet_name in excel.sheet_names:
#                         sheet_df = pd.read_excel(excel, sheet_name=sheet_name)
#                         compaDocs.append(Document(sheet_df.to_string()))
#                     num_pages_or_sheets = len(excel.sheet_names)
#                 else:
#                     excel = pd.ExcelFile(saveFile)
#                     for sheet_name in excel.sheet_names:
#                         sheet_df = pd.read_excel(excel, sheet_name=sheet_name)
#                         docs.append(Document(sheet_df.to_string()))
#                     num_pages_or_sheets = len(excel.sheet_names)

#             # Powerpoint files processing
#             elif file_extension in ['ppt', 'pptx']:
#                 if fileName in pptFileNames:
#                     path = f'{base_dir}powerpointUploads'
#                     compaFile = os.path.join(path, fileName)
#                     presentation = Presentation(saveFile)
#                     docs = [Document(slide.text) for slide in presentation.slides if hasattr(slide, 'text')]
#                     presentation = Presentation(compaFile)
#                     compaDocs = [Document(slide.text) for slide in presentation.slides if hasattr(slide, 'text')]
#                     num_pages_or_sheets = len(presentation.slides)
#                 else:
#                     presentation = Presentation(saveFile)
#                     docs = [Document(slide.text) for slide in presentation.slides if hasattr(slide, 'text')]
#                     num_pages_or_sheets = len(presentation.slides)

#             # Process document chunks and add metadata
#             chunks = text_splitter.split_documents(docs)
#             # print(chunks)

#             # if is_valid_newspaper_filename(clspattern, fileName):
#             #     chunks = chunks.replace("\n", "")
#             #     print(chunks)

#             if is_valid_newspaper_filename(pattern, fileName):
#                 if compaDocs:
#                     compaChunks = text_splitter.split_documents(compaDocs)
#                     metadataChunks = add_metadata(chunks, fileName)
#                     compaMetadataChunks = add_metadata(compaChunks, compaFile)
#                     metadata_chunks, existentChunks = chunks_equal(metadataChunks, compaMetadataChunks)
#                 else:
#                     print("We are processing add_metadata: ", fileName)
#                     metadata_chunks, existentChunks = add_metadata(chunks, fileName), []
#             else:
#                 if compaDocs:
#                     compaMetadataChunks = chunking(compaDocs, compaFile)
#                     metadataChunks = chunking(docs, fileName)
#                     metadata_chunks, existentChunks = chunks_equal(metadataChunks, compaMetadataChunks)
#                 else:
#                     print("We are processing chunking: ", fileName)
#                     metadata_chunks, existentChunks = chunking(docs, fileName), []
            
#             if (len(metadata_chunks) > 0) & (len(existentChunks) > 0): 

#                 print("apa taifanira kujamba")

#                 metadata_chunks_list = [
#                                             {
#                                                 "text": chunk.page_content,
#                                                 "metadata": chunk.metadata  
#                                             } for chunk in metadata_chunks
#                                         ]
                
#                 Title = [i["metadata"]["publicationTitle"] for i in metadata_chunks_list]

#                 for i in set(Title):
#                     response = {
#                                 "Status": "Successfully uploaded",
#                                 "File name": i,
#                                 "Number of pages or sheets": num_pages_or_sheets,
#                                 "Number of chunks": len(chunks),
#                                 "Existent Chunks": existentChunks
#                             }
#                 responses.append(response)

#                 fileSaving(save_directory, saveFile, tempDirectory)

#                 final_chunks[fileName.split(".")[0]] = {"metadata_chunks": metadata_chunks}
            
#             elif (len(metadata_chunks) > 0) & (len(existentChunks) == 0):
                
#                 metadata_chunks_list = [
#                                             {
#                                                 "text": chunk.page_content,
#                                                 "metadata": chunk.metadata  
#                                             } for chunk in metadata_chunks
#                                         ]
                
#                 Title = [i["metadata"]["publicationTitle"] for i in metadata_chunks_list]

#                 for i in set(Title):
#                     response = {
#                                 "Status": "Successfully uploaded",
#                                 "File name": i,
#                                 "Number of pages or sheets": num_pages_or_sheets,
#                                 "Number of chunks": len(chunks),
#                                 "Existent Chunks": None
#                             }
#                 responses.append(response)

#                 fileSaving(save_directory, saveFile, tempDirectory)

#                 final_chunks[fileName.split(".")[0]] = {"metadata_chunks": metadata_chunks}
            
#             elif (len(metadata_chunks) == 0) & (len(existentChunks) > 0): 

#                 print("Tiripo pachina")

#                 response = {
#                     "Status": "File chunks already existent in Database, no new files were added",
#                     "File name": fileName,
#                     "Number of pages or sheets": num_pages_or_sheets,
#                     "Number of chunks": len(chunks),
#                     "Existent Chunks": existentChunks  # Use the converted list
#                 }
#                 responses.append(response)

#                 tempfolderDelete(tempDirectory)

#             elif (len(metadata_chunks) == 0) & (len(existentChunks) == 0):

#                 print("Tiripo paChishanu")

#                 response = {
#                     "Status": "Uploading failed, please try again",
#                     "File name": fileName,
#                     "Number of pages or sheets": num_pages_or_sheets,
#                     "Number of chunks": len(chunks),
#                     "Existent Chunks": existentChunks
#                 }
#                 responses.append(response)

#                 tempfolderDelete(tempDirectory)

#             else:
#                 print("Tapinda pokupedzisira")
#                 response = {
#                     "Status": "No files processed successfully",
#                     "File name": None,
#                     "Number of pages or sheets": None,
#                     "Number of chunks": None,
#                     "Existent Chunks": None
#                 }
#                 responses.append(response)

#                 tempfolderDelete(tempDirectory)
        
#         except Exception as e:
#             print("Tapindira paError")
#             responses.append({
#                 "Status": "Failed to save file",
#                 "File name": fileName,
#                 "Error": str(e),
#             })
#     if len(final_chunks) > 0:
#         # Return final_chunks, responses, and status after processing all files
#         return final_chunks, responses, 200  
#     else:
#         return None, responses, 500
    
# def creatingVectorStore(embeddingFunction, chunks, dbDirectory):
#     print("starting to save to DB")
#     if len(chunks):

#         # Generate embeddings based on 'text' field in chunks
#         vectorStore = Chroma.from_documents(
#             documents=chunks, 
#             embedding=embeddingFunction, 
#             persist_directory=dbDirectory
#         )
#         vectorStore.persist()
    
# @app.route("/saveDB", methods=['POST'])
# def save_to_db(base_dir = base_dir):
#     json_content = request.form
#     fileObject = request.files

#     chunks, response, status_code = Uploads(fileObject)

#     if status_code != 200:
#         return jsonify(response), status_code
        
#     organisation = json_content.get("organisation")
    
#     if organisation == "Zimpapers":
#         dbDirectory = f'{base_dir}knowledgeCentreDB'
#         # dbDirectory = f'{base_dir}zidaDB'
#         if not os.path.exists(dbDirectory):
#             os.makedirs(dbDirectory)
#         if chunks:
#            for i in chunks.keys():
#                embeddingFunction =embedding
#                creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)   
#     elif organisation == "csAssistant":
#         dbDirectory = f'{base_dir}csAssistantDB'
#         if not os.path.exists(dbDirectory):
#             os.makedirs(dbDirectory)
#         if chunks:
#            for i in chunks.keys():
#                embeddingFunction =embedding
#                creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)
#     elif organisation == "zimpapersPL":
#         dbDirectory = f'{base_dir}policiesDB'
#         if not os.path.exists(dbDirectory):
#             os.makedirs(dbDirectory)
#         if chunks:
#            for i in chunks.keys():
#                embeddingFunction =embedding
#                creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)
#     else:
#         dbDirectory = f"{base_dir}{organisation}"
#         if not os.path.exists(dbDirectory):
#             os.makedirs(dbDirectory)
#         if chunks:
#             for i in chunks.keys():
#                 embeddingFunction =embedding
#                 creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)

#     # Add database upload status to the response
#     for i in range(0, len(response)):
#         response[i]['Status'] = "Successfully uploaded into Vector database"
#     # Return the updated response
#     return jsonify(response), 200

# def startApp():
#     app.run(host="0.0.0.0", port=6399, debug=True)

# if __name__ == "__main__":
#     # Call the function to display the OS information
#     startApp()

'''
    Tichavona Vakisai - Deep Analytics Senior Data Scientist
    11/10/2024 17:17Hrs
    Multimodal zbGPT Customer Insights Dashbaord
    Data Sources - PDFs, Internal Databases, Freshdesk, Freshcaller, Schools National Database
    Version 1
    Technologies - Python, Flask, Streamlit, JavaScripts, Node js, Ollama, Llama 3.2, Oracle Linux 9.3, SQL Server. Json

    This defines the Flask backend application for the zbGPT RAG. Information can be scrapped from PDFs, presentations, Excel Sheets,
    Comma Separated Vlaues (CSV) files, databases, audio and video if in english. The backend uses Rest API technology to pass 
    information from front end to backend and relaying response back to frontend.

    We have included the requirements files to define prerequisite packages for the application, but also included a pip freeze files
    specifying the environment packages at current runtime and app production. Kindly go through the README file to understand how to
    set up the application. 
'''

# Importations

from langchain_community.llms import Ollama as modelO
from flask import Flask, request, jsonify
from langchain.text_splitter import RecursiveCharacterTextSplitter as rcts
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings as fee
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from langchain.chains.combine_documents import create_stuff_documents_chain as csdc
from langchain.chains import create_retrieval_chain as crc
from langchain.prompts import PromptTemplate as pt
from docx import Document as DocxDocument
from langchain.docstore.document import Document
import pandas as pd
from pptx import Presentation
import os
from pydantic import ValidationError
from agents.internetAgent import internet_required, search_internet  # Import from internetAgent.py
from datetime import datetime
import re
from glob import glob as gb
import shutil
import ollama
import platform
import pytesseract
from typing import Any
from unstructured.partition.pdf import partition_pdf
from pdf2image import convert_from_path
from PIL import Image
import cv2
import numpy as np
from flask import send_file
from pathlib import Path
from werkzeug.utils import secure_filename
# from llama_cpp import Llama

# Set the path to the Tesseract executable and directories
if platform.system() == "Windows":   
    print("In windows") 
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    poppler_path = r'C:\Program Files\poppler-24.08.0\Library\bin'

    #Paths
    base_dir = "C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/"
    output_path = r'C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\output'
    os.makedirs(output_path, exist_ok=True)
    figures_path = r'C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\figures'

elif platform.system() == "Linux":
    pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

    # Paths
    base_dir = "/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/"
    output_path = '/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/output'
    os.makedirs(output_path, exist_ok=True)
    figures_path = '/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/figures'

app = Flask(__name__)

pattern = r'^\d{8}_[A-Za-z]{3}_[A-Za-z]{3}_[A-Za-z]{3}_\d{2}'
clspattern = r'^\d{8}_[A-Za-z]{3}_cls_[A-Za-z]{3}_[A-Za-z]{1}\d{1}'


def is_valid_newspaper_filename(pattern, fileName):
    if re.match(pattern, fileName):
        return True
    return False

# Function to check for duplicate chunkTitle
def chunk_exists(chunks, chunk_title):
    return any(chunk['metadata']['chunkTitle'] == chunk_title for chunk in chunks)

modelPath = r"C:\Users\ACER\Documents\Fine Tuning\ictllama_merged_q8_0.gguf"
llm = modelO(
    model="gpt-oss:20b",
    temperature = 0.0
    )

# llm = Llama(
#     model_path=modelPath,
#     n_ctx=2048,           # Context window (TinyLlama's default is 2048)
#     n_gpu_layers=-1,      # -1 means offload all layers to GPU (if CUDA is available)
#     temperature=0.1,      # Set temperature here, or set it per generation
#     verbose=False
# )

def generate_embeddings(text_chunks, model_name = 'nomic-embed-text:latest'):
    embeddings = []
    for chunk in text_chunks:
        embedding = ollama.embeddings(model=model_name, prompt=chunk)
        embeddings.append(embedding)
    return embeddings

try:            
    embedding = fee()  
except ValidationError as e:
    print(f"Failed to load FastEmbedEmbeddings due to validation error: {e}")
    print("Trying to manually download the model...")

    from langchain.embeddings.openai import OpenAIEmbeddings
    embedding = OpenAIEmbeddings()  

text_splitter = rcts(
    chunk_size=7500,
    chunk_overlap=1875,
    length_function=len,
    is_separator_regex='\n'
)

# Defining the dynamic prompt template
def tempCreation(temp, query):
    template = f"""
    <s>
        [INST]
            You are an intelligent AI system equipped with access to a comprehensive knowledge base consisting of:

            - Public archives of newspaper, radio, and television articles (Zimpapers).
            - Internal databases of the user's organization.
            - Private document uploads linked to the user.

            You assist journalists, researchers, and everyday users in retrieving relevant information from the following sources. You are also
            adept at handling general queries posed by users. Your responses must be informative, structured, and always present a positive 
            image of the organization, the President of Zimbabwe, his cabinet, and the country of Zimbabwe. You should also correct negative 
            perceptions with a polite and constructive tone.

            When responding to queries, choose the appropriate response type:

            1. **Zimpapers Archive**: Respond using articles from Zimpapers (newspapers, radio, TV), organized by metadata.
            2. **Internal Database**: Respond using internal company documents based on user-specific requests.
            3. **User's Uploaded Documents**: Retrieve data from personal document uploads and vector stores specific to the user.
            4. **General Questions**: Provide answers to general questions and offer spelling correction suggestions where necessary.

            ### Additional context for Zimpapers and its operations:
            The printing and broadcasting house has one television network called Zimpapers Television Network (ZTN) which started broadcasting 
            on 7 October 2017, and also started broadcasting as a free-to-air TV channel known as ZTN Prime on DSTV Channel 294 on 24 May 2022 
            at 17:30 Hours. It also has several radio stations, including one commercial radio station in Harare (Start FM) and regional stations 
            like Diamond FM (Mutare), Nyaminyami FM (Kariba), and Capitalk 100.4 FM (Harare). 

            On the print side, Zimpapers owns multiple publications with varied frequencies. Below is a summary of key publications:
                1. **B-Metro**, Bulawayo, Founded: 2010, Language: English, Frequency: Daily
                2. **Bridal Magazine**, Harare, Founded: 2011, Language: English, Frequency: Biannual
                3. **Business Weekly**, Harare, Founded: 2017, Language: English, Frequency: Weekly
                4. **The Chronicle**, Bulawayo, Founded: 1894, Language: English, Frequency: Daily
                5. **H-Metro**, Harare, Founded: 2009, Language: English, Frequency: Daily
                6. **The Herald**, Harare, Founded: 1891, Language: English, Frequency: Daily
                7. **Kwayedza**, Harare, Founded: 1986, Language: Shona, Frequency: Weekly
                8. **The Manica Post**, Mutare, Founded: 1893, Language: English, Frequency: Weekly
                9. **The Southern Times**, Windhoek, Founded: 2004, Language: English, Frequency: Weekly
                10. **Suburban**, Harare, Founded: 2016, Language: English, Frequency: Weekly
                11. **The Sunday Mail**, Harare, Founded: 1935, Language: English, Frequency: Weekly
                12. **The Sunday News**, Bulawayo, Founded: 1930, Language: English, Frequency: Weekly
                13. **uMthunywa**, Bulawayo, Founded: 2004, Language: Ndebele, Frequency: Weekly
                14. **Zimtravel**, Harare, Founded: 2003, Language: English, Frequency: Monthly

            Here is how you should structure your responses:

            {temp}

            Remember:
            - Always maintain a respectful tone and positively affirm Zimbabwe, its leadership, and the organization.
            - When context is insufficient, inform the user and offer alternative suggestions or general knowledge.

            Generate responses based on the following user query: {query}
        [/INST]
    </s>
    """

    return template

def generate_prompt_with_dict(organisation, query):
    source_type = organisation
    
    if source_type == "Zimpapers":
        temp = """
                ### When retrieving articles from Zimpapers Knowledge Centre:
                - **Publication Title**: metadata "publicationTitle" which is the newspaper publication title line Sunday Mail, The Herald etc
                - **Date**: metadata "date" which is the date the newspaper title was published
                - **Page**: metadata "page" which is the page number the article is found on
                - **Chunk Title**: metadata "chunkTitle" which is the title of the chunk in the vector store
                - **Paper Section**: metadata "paperSection" which is the section of the newspaper title the article is contained
                - **Location**: metadata "location" which is information about where the newspaper title is based
                - **Text**: metadata "text" which is text for the chunk in the vector store
                - **Image Available**: 'Yes' if has_image else 'No'
            """
    elif source_type == "csAssistant":
        temp = """
                ### When retrieving articles from Customer Service Assistant Vector Store:
                You are an intelligent and friendly customer service assistant with access to a comprehensive knowledge base 
                that includes:
                
                FAQs, product manuals, service agreements, and customer support database.

                Your task is to provide factual, clear, and helpful responses to customer inquiries.
                Ensure polite greeting, core identification of the query, and useful suggestions.
                Use this format when assisting customers:

                Greeting: "Hello! How can I assist you today?"
                Inquiry: The customer query.
                Response: Useful information from the knowledge base, steps or guidance.
                Closing: "Is there anything else I can assist you with? Have a great day!"
            """
    elif source_type == "zimpapersPL":
        temp = """
                ### When retrieving internal documents:
                - **Publication Title**: The title of the document from the metadata.
                - **Chunk Title**: The title of the chunk in the vector store.
                - **Page**: The page number the chunk is found from in the document.
                - **Summary**: The chunk text summary.
            """
    else:
        temp = """
                ### When retrieving from user-uploaded documents:
                - **Publication Title**: The title of the document contained in the metadata.
                - **Chunk Title**: The title of the chunk in the vector store.
                - **Page**: The page number the chunk is found from in the document.
                - **Summary**: The chunk text summary.
            """
    template = tempCreation(temp, query)
    completeTemplate = f"""
    <System>
        {template}
    </System>
    """
    return completeTemplate

completeTemp = f""" <s>[INST] You are an AI chatbot having a conversation with a human. Answer his questions factually and truthfully
 based on the context provided. If you do not know the answer, just say i do not know the answer and do not make up answers not in the context provided."""

def promptMaking(completeTemplate):
    # Combine system prompt with input and context
    prompt = completeTemplate + """
[INST] 
    input: {input}
    Context: {context}
    Answer:
[/INST]
    """
    
    rawPrompt = pt.from_template(prompt)
    
    return rawPrompt

class Document:
    def __init__(self, text, metadata=None):
        self.page_content = text
        self.metadata = metadata or {}

# Unified endpoint that handles both cases
@app.route("/query", methods=['POST'])
def unified_query():
    """Unified endpoint that routes to either AI or DB query based on organisation"""
    try:
        json_content = request.json
        organisation = json_content.get("organisation")
        print(organisation)
        
        if organisation and organisation.strip():
            return dbQuery()
        else:
            return aiChatbotPost()
    except Exception as e:
        print(f"Error in unified_query: {str(e)}")
        return jsonify({
            "answer": "Sorry, an error occurred while processing your request.",
            "sources": [],
            "source_count": 0,
            "organisation": "error"
        }), 500

# WhatsApp webhook endpoint
@app.route('/whatsapp/webhook', methods=['GET', 'POST'])
def whatsapp_webhook():
    # Verification for GET requests (WhatsApp webhook verification)
    if request.method == 'GET':
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')
        
        verification_token = os.environ.get('WHATSAPP_VERIFICATION_TOKEN', 'default-token')
        
        if mode == 'subscribe' and token == verification_token:
            return challenge, 200
        else:
            return 'Verification failed', 403
    
    # Handle POST requests (incoming messages)
    elif request.method == 'POST':
        try:
            data = request.get_json()
            # Process the WhatsApp message here
            print("Received WhatsApp webhook:", data)
            
            # Extract message content from WhatsApp webhook format
            messages = data.get('entry', [{}])[0].get('changes', [{}])[0].get('value', {}).get('messages', [])
            
            if messages:
                message = messages[0]
                if message.get('type') == 'text':
                    text = message.get('text', {}).get('body', '')
                    from_number = message.get('from', '')
                    
                    print(f"Message from {from_number}: {text}")

                    response = unified_query()
                    
                    # Process the message - you can call your AI endpoints here
                    # For example:
                    # response = process_whatsapp_message(text, from_number)
                    
                    return jsonify({"status": "success", "message": response}), 200
            
            return jsonify({"status": "success", "message": "No text message found"}), 200
            
        except Exception as e:
            print("Error processing webhook:", e)
            return jsonify({"error": str(e)}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    # Verify API key if you want authentication
    api_key = request.headers.get('X-API-Key')
    expected_api_key = os.environ.get('FLASK_API_KEY', 'default-secret-key')
    
    if api_key != expected_api_key:
        return jsonify({"error": "Unauthorized"}), 401
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Flask LLM Backend",
        "version": "1.0",
        "endpoints": {
            "/ai": "Basic AI queries (POST)",
            "/dbQuerying": "Organisation-specific queries (POST)",
            "/query": "Unified query endpoint (POST)",
            "/health": "Health check (GET)",
            "/whatsapp/webhook": "WhatsApp webhook (GET/POST)"
        }
    })

# @app.route('/download/<path:filename>', methods=['GET'])
# def download_file( filename):
#     """Download a source file"""
#     try:
#         organisation = request.args.get('organisation', '')
#         # Verify API key
#         api_key = request.headers.get('X-API-Key')
#         expected_api_key = os.environ.get('FLASK_API_KEY', 'default-secret-key')
        
#         if api_key != expected_api_key:
#             return jsonify({"error": "Unauthorized"}), 401
        
#         # Determine the base directory based on organisation
#         base_dir = r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\pdfUploads"
            
#         # Clean the filename to prevent directory traversal
#         safe_filename = secure_filename(filename)

#         search_directories = [
#             r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\pdfUploads",
#             r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\wordUploads",
#             r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\excelUploads",
#             r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\powerpointUploads",
#         ]
        
#         # Also check the Linux path format (for metadata compatibility)
#         linux_base = "/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/"
#         linux_dirs = [
#             f"{linux_base}pdfUploads",
#             f"{linux_base}wordUploads", 
#             f"{linux_base}excelUploads",
#             f"{linux_base}powerpointUploads",
#         ]

#          # Search for the file in all possible locations
#         file_path = None
#         for search_dir in search_directories:
#             potential_path = Path(search_dir) / safe_filename
#             if potential_path.exists():
#                 file_path = potential_path
#                 break
        
#         # Also check Linux-style paths (converted to Windows)
#         if not file_path:
#             for linux_dir in linux_dirs:
#                 # Convert Linux path to Windows path
#                 windows_path = linux_dir.replace("/mnt/c/", "C:/")
#                 potential_path = Path(windows_path) / safe_filename
#                 if potential_path.exists():
#                     file_path = potential_path
#                     break

#         if not file_path:
#             base_search = r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2"
#             for root, dirs, files in os.walk(base_search):
#                 if safe_filename in files:
#                     file_path = Path(root) / safe_filename
#                     break
        
#         if not file_path or not file_path.exists():
#             print(f"File not found: {safe_filename}")
#             return jsonify({"error": f"File not found: {safe_filename}"}), 404
        
#         print(f"Serving file: {file_path}")
#         return send_file(
#             file_path,
#             as_attachment=True,
#             download_name=safe_filename,
#             mimetype='application/pdf'
#         )
        
#     except Exception as e:
#         print(f"Error downloading file {filename}: {e}")
#         return jsonify({"error": str(e)}), 500
    
@app.route('/download/<path:filename>', methods=['GET'])
def download_file(filename):
    """Download a source file with improved path handling"""
    try:
        # Get organisation from query parameter
        organisation = request.args.get('organisation', '')
        
        # Clean the filename
        safe_filename = secure_filename(filename)
        
        # Define possible base directories to search
        search_directories = [
            r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\pdfUploads",
            r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\wordUploads",
            r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\excelUploads",
            r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2\powerpointUploads",
        ]
        
        # Also check the Linux path format (for metadata compatibility)
        linux_base = "/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/"
        linux_dirs = [
            f"{linux_base}pdfUploads",
            f"{linux_base}wordUploads", 
            f"{linux_base}excelUploads",
            f"{linux_base}powerpointUploads",
        ]
        
        # Search for the file in all possible locations
        file_path = None
        for search_dir in search_directories:
            potential_path = Path(search_dir) / safe_filename
            if potential_path.exists():
                file_path = potential_path
                break
        
        # Also check Linux-style paths (converted to Windows)
        if not file_path:
            for linux_dir in linux_dirs:
                # Convert Linux path to Windows path
                windows_path = linux_dir.replace("/mnt/c/", "C:/")
                potential_path = Path(windows_path) / safe_filename
                if potential_path.exists():
                    file_path = potential_path
                    break
        
        # Try to find the file by searching recursively if not found
        if not file_path:
            base_search = r"C:\Users\ACER\Documents\DecisionEdgeConcepts\CorporateGPT2\CorporateGPT2"
            for root, dirs, files in os.walk(base_search):
                if safe_filename in files:
                    file_path = Path(root) / safe_filename
                    break
        
        if not file_path or not file_path.exists():
            print(f"File not found: {safe_filename}")
            return jsonify({"error": f"File not found: {safe_filename}"}), 404
        
        print(f"Serving file: {file_path}")
        return send_file(
            file_path,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error downloading file {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file_api(filename):
    """Alternative download endpoint with CORS headers and improved path handling"""
    try:
        safe_filename = secure_filename(filename)
        
        # Define search paths
        search_paths = [
            f"C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/pdfUploads/{safe_filename}",
            f"C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/wordUploads/{safe_filename}",
            f"C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/excelUploads/{safe_filename}",
            f"C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/powerpointUploads/{safe_filename}",
        ]
        
        file_path = None
        for path in search_paths:
            if os.path.exists(path):
                file_path = path
                break
        
        # Search recursively if not found
        if not file_path:
            base_dir = "C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2"
            for root, dirs, files in os.walk(base_dir):
                if safe_filename in files:
                    file_path = os.path.join(root, safe_filename)
                    break
        
        if not file_path or not os.path.exists(file_path):
            print(f"File not found: {safe_filename}")
            return jsonify({"error": f"File not found: {safe_filename}"}), 404
        
        response = send_file(
            file_path,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='application/pdf'
        )
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-API-Key'
        
        return response
        
    except Exception as e:
        print(f"Error downloading file {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/ai", methods=['POST'])
def aiPost():
    print('Post /ai called')
    json_content = request.json
    query = json_content.get("query")
    print(f'query: {query}')

    response = llm.invoke(query)
    print(response)

    # Check if the response is relevant
    if "I do not have enough information" in response or "I cannot answer" in response:
        responseAnswer = {"response": "The information provided is insufficient to answer your query accurately."}
    else:
        responseAnswer = {"response": response}

    return jsonify(responseAnswer)

@app.route("/aiChatbot", methods=['POST'])
def aiChatbotPost():
    print('Post /aiChatbot called')
    json_content = request.json
    query = json_content.get("query")
    print(f'query: {query}')

    response = llm.invoke(query)
    print(response)

    # Return consistent format with other endpoints
    if "I do not have enough information" in response or "I cannot answer" in response:
        response_answer = "The information provided is insufficient to answer your query accurately."
    else:
        response_answer = response

    # Return the same format as dbQuerying for consistency
    return jsonify({
        "answer": response_answer, 
        "sources": [],
        "source_count": 0,
        "organisation": "general"
    })

# @app.route("/dbQuerying", methods=['POST'])
# def dbQuery(base_dir = base_dir):
#     json_content = request.json
#     organisation = json_content.get("organisation")
#     query = json_content.get("query")
#     customPrompt = json_content.get('prompt')

#      # If no organisation provided, redirect to basic AI endpoint
#     if not organisation or not organisation.strip():
#         return aiPost()

#     # Set database directories based on the organisation
#     if organisation == "Zimpapers":
#         dbDirectory = f"{base_dir}knowledgeCentreDB"
#     elif organisation == "csAssistant":
#         dbDirectory = f"{base_dir}csAssistantDB"
#     elif organisation == "zimpapersPL":
#         dbDirectory = f"{base_dir}policiesDB"
#     else:
#         dbDirectory = f"{base_dir}{organisation}"
    
#     completeTemplate = generate_prompt_with_dict(organisation, query)
#     rawPrompt = promptMaking(completeTemplate)
    
#     print(f'Post /Querying documents in {organisation} database')

#     # Load Vectorstore database
#     vectorStore = Chroma(persist_directory=dbDirectory, embedding_function=embedding)

#     # Creating retriever option with refined settings
#     retriever = vectorStore.as_retriever(
#         search_type="similarity_score_threshold",
#         search_kwargs={
#             "k": 10,
#             "score_threshold": 0.5  # Stricter threshold
#         }
#     )

#     # Set up document chain and retrieval system
#     documentChain = csdc(llm, rawPrompt)
#     chain = crc(retriever, documentChain)

#     # Run the query through the chain
#     input = query
#     result = chain.invoke({"input": input})

#     # Collect sources with metadata from the result
#     sources = []
#     for doc in result.get('context', []):
#         if 'source' in doc.metadata:
#             sources.append(
#                 {
#                     'source': Path(doc.metadata['source']).name,
#                     'Page number': doc.metadata.get('page', 'N/A'),
#                     "Page Content": doc.page_content[:500] + "...",
#                     'full_path': str(doc.metadata.get('source', '')),
#                     'document_type': Path(doc.metadata['source']).suffix,
#                     'download_available': True
#                 }
#             )
        
#     print(sources)

#     # Return the response with answer and sources
#     response = {"answer": result['answer'], "sources": sources, "source_count": len(sources), "organisation": organisation}
#     return jsonify(response)

@app.route("/dbQuerying", methods=['POST'])
def dbQuery(base_dir = base_dir):
    json_content = request.json
    organisation = json_content.get("organisation")
    query = json_content.get("query")
    customPrompt = json_content.get('prompt')

    # If no organisation provided, redirect to basic AI endpoint
    if not organisation or not organisation.strip():
        return aiPost()

    # Set database directories based on the organisation
    if organisation == "Zimpapers":
        dbDirectory = f"{base_dir}knowledgeCentreDB"
    elif organisation == "csAssistant":
        dbDirectory = f"{base_dir}csAssistantDB"
    elif organisation == "zimpapersPL":
        dbDirectory = f"{base_dir}policiesDB"
    else:
        dbDirectory = f"{base_dir}{organisation}"
    
    completeTemplate = generate_prompt_with_dict(organisation, query)
    rawPrompt = promptMaking(completeTemplate)
    
    print(f'Post /Querying documents in {organisation} database')

    # Load Vectorstore database
    vectorStore = Chroma(persist_directory=dbDirectory, embedding_function=embedding)

    # Creating retriever option with refined settings
    retriever = vectorStore.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={
            "k": 10,
            "score_threshold": 0.5
        }
    )

    # Set up document chain and retrieval system
    documentChain = csdc(llm, rawPrompt)
    chain = crc(retriever, documentChain)

    # Run the query through the chain
    input = query
    result = chain.invoke({"input": input})

    # ============ SOURCE DE-DUPLICATION WITH PROPER PATH HANDLING ============
    unique_sources_dict = {}
    
    for doc in result.get('context', []):
        source_path = doc.metadata.get('source', '')
        if source_path:
            # Extract just the filename from the path
            file_name = Path(source_path).name
            
            # Use filename as key for de-duplication
            if file_name not in unique_sources_dict:
                unique_sources_dict[file_name] = {
                    'source': file_name,  # Store only the filename, not the full path
                    'Page number': doc.metadata.get('page', 'N/A'),
                    "Page Content": doc.page_content[:500] + "...",
                    'full_path': source_path,
                    'document_type': Path(source_path).suffix,
                    'download_available': True
                }
            else:
                # If source already exists, collect all page numbers
                existing_pages = unique_sources_dict[file_name]['Page number']
                new_page = doc.metadata.get('page', 'N/A')
                
                if isinstance(existing_pages, list):
                    if str(new_page) not in [str(p) for p in existing_pages]:
                        existing_pages.append(new_page)
                else:
                    if str(existing_pages) != str(new_page):
                        unique_sources_dict[file_name]['Page number'] = [existing_pages, new_page]
    
    # Convert dictionary to list
    sources = list(unique_sources_dict.values())
    
    # Sort sources by file name
    sources.sort(key=lambda x: x['source'])
    
    print(f"Found {len(sources)} unique sources (de-duplicated from {len(result.get('context', []))} chunks)")

    # Return the response with answer and de-duplicated sources
    response = {
        "answer": result['answer'], 
        "sources": sources, 
        "source_count": len(sources), 
        "organisation": organisation
    }
    return jsonify(response)

def move_and_rename_files(source_folder, destination_folder, new_name_prefix):
    # Ensure the destination folder exists
    os.makedirs(destination_folder, exist_ok=True)

    # Get a list of files in the source folder
    files = list(Path(source_folder).glob('*.jpg'))

    filenames, file_paths = [], []

    for file_path in files:
        filename = file_path.stem
        
        # Create a new file name with a prefix and index
        new_filename = f"{new_name_prefix}_{filename}.jpg"
        
        # Define the new file path in the destination folder
        new_file_path = os.path.join(destination_folder, new_filename)

        # Move and rename the file
        shutil.move(file_path, new_file_path)
        
        print(f"Moved and renamed '{filename}' to '{new_file_path}'")
        filenames.append(new_filename)
        file_paths.append(new_file_path)
    
    return filenames, file_paths

# Securely join paths to prevent directory traversal attacks
def secure_join(directory, filename):
    filepath = os.path.join(directory, filename)
    if os.path.commonprefix([os.path.abspath(filepath), os.path.abspath(directory)]) != os.path.abspath(directory):
        return None
    return filepath

# Preprocess text function
def clean_text(text):
    cleaned = re.sub(r'\(cid:\d+\)', '', text)
    return cleaned

def check_folder(folder_path):
    # Check if the folder exists
    if os.path.exists(folder_path) and os.path.isdir(folder_path):
        return 200
    else:
        return 404
    
def add_metadata(chunks, fileName):
    print(fileName)
    metadataDict = {
        "SUN":"SUNDAY MAIL",
        "BRI":"BRIDGE",
        "HAR":"HARARE",
        "BUS":"BUSINESS",
        "CLS":"CLASSIFIEDS",
        "EXT":"EXTRA",
        "JOB":"JOB CENTRE",
        "LEI":"LEISURE",
        "MAI":"MAIN",
        "POS":"POSTER",
        "REL":"RELIGION",
        "SUP":"SUPPLEMENTARY IMAGES",
        "SPC":"SUPPLEMENTARY"
    }

    locationDict = {
        "HAR":"HARARE",
        "BYO":"BULAWAYO",
        "MRE":"MUTARE"
    }

    file_components = fileName.split('_')
    if len(file_components) in [5, 6]:
        publicationTitle = metadataDict[file_components[1].upper()]
        paperSection = metadataDict[file_components[2].upper()]
        page = file_components[4].split(".")[0]
        date = file_components[0]
        location = locationDict[file_components[3].upper()]
        subsection = metadataDict[file_components[5].split(".")[0].upper()] if len(file_components) == 6 else ''
    else:
        return []
    
    metadata_chunks = []
    i = 1    
    for chunk in chunks:
        # Create custom metadata
        custom_metadata = {
            "publicationTitle": publicationTitle,
            "chunkNumber": str(i),
            "chunkTitle": f'{fileName.split(".")[0]}{str(page)}{str(i)}',
            "paperSection": paperSection,
            "date": datetime.strptime(date, "%Y%m%d").strftime('%Y-%m-%d'),
            "location": location,
            "subsection": subsection,
            "dateAdded": datetime.today().strftime('%Y-%m-%d'),
            "page":page
        }
        # Update chunk's existing metadata with custom metadata (without overwriting)
        chunk.metadata.update(custom_metadata)
            
        # Append the chunk with updated metadata
        metadata_chunks.append(chunk)
                
        i += 1
    
    return metadata_chunks

def chunking(docs, file):
    metadata_chunks = []
    file = os.path.basename(file)
    
    if file.split(".")[-1] == 'pdf':
        directory = 'pdfUploads'
    elif 'doc' in file.split(".")[-1]:
        directory = 'wordUploads'
    elif 'xls' in file.split(".")[-1]:
        directory = 'excelUploads'
    else:
        directory = 'powerpointUploads'

    for doc in docs:
        chunks = text_splitter.split_documents([doc])
        page_number = doc.metadata.get('page', None)
        i = 1
        base = f'/mnt/c/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/{directory}/'
        for chunk in chunks:
            # Create custom metadata
            custom_metadata = {
                "publicationTitle": file,
                "chunkNumber": str(i),
                "chunkTitle": f'{file.split(".")[0]}{str(page_number)}{str(i)}',
                "paperSection": "",
                "date": datetime.today().strftime('%Y-%m-%d'),
                "location": "",
                "subsection": "",
                "dateAdded": datetime.today().strftime('%Y-%m-%d'),
                "source": ''.join([base,file])
            }
            
            # Update chunk's existing metadata with custom metadata (without overwriting)
            chunk.metadata.update(custom_metadata)
            
            # Append the chunk with updated metadata
            metadata_chunks.append(chunk)

            i += 1  # Increment chunk number

    return metadata_chunks

def fileSaving(save_directory, saveFile, tempDirectory):
    # Define the destination folder
    destination_folder = os.path.join(save_directory)

    # Make sure the destination folder exists
    os.makedirs(destination_folder, exist_ok=True)

    # Move the file
    shutil.move(saveFile, destination_folder)

    # Save the file
    tempfolderDelete(tempDirectory)

def tempfolderDelete(tempDirectory):
    # Save the file
    if os.path.exists(tempDirectory):
        shutil.rmtree(tempDirectory)

# Function to check if two chunks are equal based on 'text' and 'metadata'
def chunks_equal(list1, list2):
    existentChunks, metadata_chunks = [], []
    if len(list1) == len(list2):
        i = 0
        while i < len(list1):
            if (list1[i].page_content == list2[i].page_content) and (list1[i].metadata == list1[i].metadata):
                existentChunks.append(list1[i].metadata['chunkTitle'])
            else:
                metadata_chunks.append(list1[i])
            i += 1
    return metadata_chunks, existentChunks

def pdfChunker(pdf_path, figures_path):
    pdf_path = Path(pdf_path)
    
    document_name = pdf_path.stem 
    print(f"Processing file: {document_name}")

    # Convert PDF pages to images for OCR
    if platform.system() == "Windows":
        pages = convert_from_path(pdf_path, 300, poppler_path=poppler_path)
    elif platform.system() == "Linux":
        pages = convert_from_path(pdf_path, 300)
    extracted_text = []
    image_annotations = ''
    docs =[]

    # Extract unstructured text with OCR
    for page_num, page in enumerate(pages):
        open_cv_image = np.array(page)[:, :, ::-1].copy()
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
        text = pytesseract.image_to_string(Image.fromarray(thresh))
        extracted_text.append(text)#clean_text(text))

    # Combine extracted text from OCR
    final_extracted_content = "\n".join(extracted_text)

    if platform.system() == "Linux":
        # Use partition_pdf to extract images and structured elements
        raw_pdf_elements = partition_pdf(
            filename=str(pdf_path),
            extract_images_in_pdf=True,
            infer_table_structure=True,
            chunking_strategy='by_title',
            max_characters=4000,
            new_after_n_chars=3800,
            combine_text_under_n_chars=2000,
            image_output_dir=output_path
        )

        checkMeasure = check_folder(figures_path)

        # Process and annotate each extracted image
        # for index, element in enumerate(raw_pdf_elements):
        if checkMeasure == 200:
            imageNames, imagePaths = move_and_rename_files(figures_path, output_path, document_name)

            for i in range(len(imageNames)):

                #image_caption = getattr(element.metadata, 'title', 'Image')  # Extract title as caption if available
                image_output_filename = imageNames[i]
                image_output_path = imagePaths[i]

                # Add image annotation to the text
                annotation = f"Image: {image_output_filename} - {image_output_path}\n"
                image_annotations += f"{annotation} | "

                # Insert annotation in text content
                final_extracted_content += f"\n{annotation}\n"

    # Create a Document object
    document = Document(
        text=final_extracted_content,
        metadata={
            "document_name": document_name,
            "image_annotations": image_annotations.rstrip(" | "),
            "source": str(pdf_path)
        }
    )

    docs.append(document)
        
    return docs, len(pages)

def Uploads(fileObject, base_dir = base_dir):
    if 'file' not in fileObject:
        return None, {"Status": "No files found in the request"}, 400
    
    files = fileObject.getlist('file')

    if not files or all(file.filename == '' for file in files):
        return None, {"Status": "No files selected"}, 400

    responses = []
    final_chunks = dict()

    for file in files:
        try:
            fileName = "_".join(file.filename.lower().split()).replace("-", "_").replace("+", "_").replace("__", "_")
            # print(f"First file name: {fileName}")
            # if len(fileName.split("+")) > 0:
            #     fileName = str(fileName).replace("+", "_")
            # elif len(fileName.split()) > 0:
            #     fileName = "_".join(str(fileName).split())
            # elif len(fileName.split("-")) > 0:
            #     fileName = str(fileName).replace("-", "_")
            # else:
            #     fileName = "_".join(str(fileName).split())
            # print(f"Final file name: {fileName}")

            file_extension = fileName.split('.')[-1]

            save_directory = {
                'pdf': f"{base_dir}pdfUploads",
                'doc': f"{base_dir}wordUploads",
                'docx': f"{base_dir}wordUploads",
                'xls': f"{base_dir}excelUploads",
                'xlsx': f"{base_dir}excelUploads",
                'ppt': f"{base_dir}powerpointUploads",
                'pptx': f"{base_dir}powerpointUploads"
            }.get(file_extension)

            if save_directory is None:
                responses.append({
                    "Status": "Unsupported file type",
                    "File name": fileName
                })
                continue

            tempDirectory = f"{base_dir}tempUploads"

            if not os.path.exists(tempDirectory):
                os.makedirs(tempDirectory)

            saveFile = '/'.join([tempDirectory, fileName])
            # Save the file
            file.save(saveFile)

            # Variables to store document chunks and comparison results
            docs = []
            compaDocs = []
            num_pages_or_sheets = 0

            if platform.system() == "Windows":
                # Retrieve lists of previously uploaded files for comparison
                fileListPDF = gb(os.path.join(r'.\CorporateGPT2\pdfUploads', '*.pdf'))
                fileListword = gb(os.path.join(r'.\CorporateGPT2\wordUploads', '*.doc*'))
                fileListExcel = gb(os.path.join(r'.\CorporateGPT2\excelUploads', '*.xls*'))
                fileListPPT = gb(os.path.join(r'.\CorporateGPT2\powerpointUploads', '*.ppt*'))

            elif platform.system() == "Linux":
                # Retrieve lists of previously uploaded files for comparison
                fileListPDF = list(Path(f"{base_dir}pdfUploads").glob('*.pdf'))
                fileListword = list(Path(f"{base_dir}wordUploads").glob('*.doc*'))
                fileListExcel = list(Path(f"{base_dir}excelUploads").glob('*.xls*'))
                fileListPPT = list(Path(f"{base_dir}powerpointUploads").glob('*.ppt*'))

            # Store previously uploaded filenames for easy comparison
            pdfFileNames = [Path(i).name for i in fileListPDF]
            wordFileNames = [Path(i).name for i in fileListword]
            excelFileNames = [Path(i).name for i in fileListExcel]
            pptFileNames = [Path(i).name for i in fileListPPT]

            # File processing based on extension
            #PDF Files Processing
            if file_extension == 'pdf':
                if fileName in pdfFileNames:
                    path = f"{base_dir}pdfUploads"
                    compaFile = '/'.join([path, fileName])
                    docs, num_pages_or_sheets = pdfChunker(saveFile, figures_path)
                    compaDocs, _ = pdfChunker(compaFile, figures_path)
                else:
                    docs, num_pages_or_sheets = pdfChunker(saveFile, figures_path)

            # Word files processing
            elif file_extension in ['doc', 'docx']:
                if fileName in wordFileNames:
                    path = f'{base_dir}wordUploads'
                    compaFile = os.path.join(path, fileName)
                    doc = DocxDocument(saveFile)
                    docs = [Document(p.text) for p in doc.paragraphs if p.text.strip()]
                    doc = DocxDocument(compaFile)
                    compaDocs = [Document(p.text) for p in doc.paragraphs if p.text.strip()]
                    num_pages_or_sheets = len(docs)
                else:
                    doc = DocxDocument(saveFile)
                    docs = [Document(p.text) for p in doc.paragraphs if p.text.strip()]
                    num_pages_or_sheets = len(docs)

            # Excel files processing
            elif file_extension in ['xls', 'xlsx']:
                if fileName in excelFileNames:
                    path = f'{base_dir}excelUploads'
                    compaFile = os.path.join(path, fileName)
                    excel = pd.ExcelFile(saveFile)
                    for sheet_name in excel.sheet_names:
                        sheet_df = pd.read_excel(excel, sheet_name=sheet_name)
                        docs.append(Document(sheet_df.to_string()))
                    excel = pd.ExcelFile(compaFile)
                    for sheet_name in excel.sheet_names:
                        sheet_df = pd.read_excel(excel, sheet_name=sheet_name)
                        compaDocs.append(Document(sheet_df.to_string()))
                    num_pages_or_sheets = len(excel.sheet_names)
                else:
                    excel = pd.ExcelFile(saveFile)
                    for sheet_name in excel.sheet_names:
                        sheet_df = pd.read_excel(excel, sheet_name=sheet_name)
                        docs.append(Document(sheet_df.to_string()))
                    num_pages_or_sheets = len(excel.sheet_names)

            # Powerpoint files processing
            elif file_extension in ['ppt', 'pptx']:
                if fileName in pptFileNames:
                    path = f'{base_dir}powerpointUploads'
                    compaFile = os.path.join(path, fileName)
                    presentation = Presentation(saveFile)
                    docs = [Document(slide.text) for slide in presentation.slides if hasattr(slide, 'text')]
                    presentation = Presentation(compaFile)
                    compaDocs = [Document(slide.text) for slide in presentation.slides if hasattr(slide, 'text')]
                    num_pages_or_sheets = len(presentation.slides)
                else:
                    presentation = Presentation(saveFile)
                    docs = [Document(slide.text) for slide in presentation.slides if hasattr(slide, 'text')]
                    num_pages_or_sheets = len(presentation.slides)

            # Process document chunks and add metadata
            chunks = text_splitter.split_documents(docs)
            # print(chunks)

            # if is_valid_newspaper_filename(clspattern, fileName):
            #     chunks = chunks.replace("\n", "")
            #     print(chunks)

            if is_valid_newspaper_filename(pattern, fileName):
                if compaDocs:
                    compaChunks = text_splitter.split_documents(compaDocs)
                    metadataChunks = add_metadata(chunks, fileName)
                    compaMetadataChunks = add_metadata(compaChunks, compaFile)
                    metadata_chunks, existentChunks = chunks_equal(metadataChunks, compaMetadataChunks)
                else:
                    print("We are processing add_metadata: ", fileName)
                    metadata_chunks, existentChunks = add_metadata(chunks, fileName), []
            else:
                if compaDocs:
                    compaMetadataChunks = chunking(compaDocs, compaFile)
                    metadataChunks = chunking(docs, fileName)
                    metadata_chunks, existentChunks = chunks_equal(metadataChunks, compaMetadataChunks)
                else:
                    print("We are processing chunking: ", fileName)
                    metadata_chunks, existentChunks = chunking(docs, fileName), []
            
            if (len(metadata_chunks) > 0) & (len(existentChunks) > 0): 

                print("apa taifanira kujamba")

                metadata_chunks_list = [
                                            {
                                                "text": chunk.page_content,
                                                "metadata": chunk.metadata  
                                            } for chunk in metadata_chunks
                                        ]
                
                Title = [i["metadata"]["publicationTitle"] for i in metadata_chunks_list]

                for i in set(Title):
                    response = {
                                "Status": "Successfully uploaded",
                                "File name": i,
                                "Number of pages or sheets": num_pages_or_sheets,
                                "Number of chunks": len(chunks),
                                "Existent Chunks": existentChunks
                            }
                responses.append(response)

                fileSaving(save_directory, saveFile, tempDirectory)

                final_chunks[fileName.split(".")[0]] = {"metadata_chunks": metadata_chunks}
            
            elif (len(metadata_chunks) > 0) & (len(existentChunks) == 0):
                
                metadata_chunks_list = [
                                            {
                                                "text": chunk.page_content,
                                                "metadata": chunk.metadata  
                                            } for chunk in metadata_chunks
                                        ]
                
                Title = [i["metadata"]["publicationTitle"] for i in metadata_chunks_list]

                for i in set(Title):
                    response = {
                                "Status": "Successfully uploaded",
                                "File name": i,
                                "Number of pages or sheets": num_pages_or_sheets,
                                "Number of chunks": len(chunks),
                                "Existent Chunks": None
                            }
                responses.append(response)

                fileSaving(save_directory, saveFile, tempDirectory)

                final_chunks[fileName.split(".")[0]] = {"metadata_chunks": metadata_chunks}
            
            elif (len(metadata_chunks) == 0) & (len(existentChunks) > 0): 

                print("Tiripo pachina")

                response = {
                    "Status": "File chunks already existent in Database, no new files were added",
                    "File name": fileName,
                    "Number of pages or sheets": num_pages_or_sheets,
                    "Number of chunks": len(chunks),
                    "Existent Chunks": existentChunks  # Use the converted list
                }
                responses.append(response)

                tempfolderDelete(tempDirectory)

            elif (len(metadata_chunks) == 0) & (len(existentChunks) == 0):

                print("Tiripo paChishanu")

                response = {
                    "Status": "Uploading failed, please try again",
                    "File name": fileName,
                    "Number of pages or sheets": num_pages_or_sheets,
                    "Number of chunks": len(chunks),
                    "Existent Chunks": existentChunks
                }
                responses.append(response)

                tempfolderDelete(tempDirectory)

            else:
                print("Tapinda pokupedzisira")
                response = {
                    "Status": "No files processed successfully",
                    "File name": None,
                    "Number of pages or sheets": None,
                    "Number of chunks": None,
                    "Existent Chunks": None
                }
                responses.append(response)

                tempfolderDelete(tempDirectory)
        
        except Exception as e:
            print("Tapindira paError")
            responses.append({
                "Status": "Failed to save file",
                "File name": fileName,
                "Error": str(e),
            })
    if len(final_chunks) > 0:
        # Return final_chunks, responses, and status after processing all files
        return final_chunks, responses, 200  
    else:
        return None, responses, 500
    
def creatingVectorStore(embeddingFunction, chunks, dbDirectory):
    print("starting to save to DB")
    if len(chunks):

        # Generate embeddings based on 'text' field in chunks
        vectorStore = Chroma.from_documents(
            documents=chunks, 
            embedding=embeddingFunction, 
            persist_directory=dbDirectory
        )
        vectorStore.persist()
    
@app.route("/saveDB", methods=['POST'])
def save_to_db(base_dir = base_dir):
    json_content = request.form
    fileObject = request.files

    chunks, response, status_code = Uploads(fileObject)

    if status_code != 200:
        return jsonify(response), status_code
        
    organisation = json_content.get("organisation")
    
    if organisation == "Zimpapers":
        dbDirectory = f'{base_dir}knowledgeCentreDB'
        # dbDirectory = f'{base_dir}zidaDB'
        if not os.path.exists(dbDirectory):
            os.makedirs(dbDirectory)
        if chunks:
           for i in chunks.keys():
               embeddingFunction =embedding
               creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)   
    elif organisation == "csAssistant":
        dbDirectory = f'{base_dir}csAssistantDB'
        if not os.path.exists(dbDirectory):
            os.makedirs(dbDirectory)
        if chunks:
           for i in chunks.keys():
               embeddingFunction =embedding
               creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)
    elif organisation == "zimpapersPL":
        dbDirectory = f'{base_dir}policiesDB'
        if not os.path.exists(dbDirectory):
            os.makedirs(dbDirectory)
        if chunks:
           for i in chunks.keys():
               embeddingFunction =embedding
               creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)
    else:
        dbDirectory = f"{base_dir}{organisation}"
        if not os.path.exists(dbDirectory):
            os.makedirs(dbDirectory)
        if chunks:
            for i in chunks.keys():
                embeddingFunction =embedding
                creatingVectorStore(embeddingFunction, chunks[i]['metadata_chunks'], dbDirectory)

    # Add database upload status to the response
    for i in range(0, len(response)):
        response[i]['Status'] = "Successfully uploaded into Vector database"
    # Return the updated response
    return jsonify(response), 200

def startApp():
    app.run(host="0.0.0.0", port=4110, debug=True)

if __name__ == "__main__":
    # Call the function to display the OS information
    startApp()
