from docx import Document as DocxDocument
from flask import Flask, request, jsonify
from huggingface_hub import InferenceClient
import InstructorEmbedding as ie
from langchain.chains import create_retrieval_chain as crc
from langchain.chains.combine_documents import create_stuff_documents_chain as csdc
from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter as rcts
from langchain_community.document_loaders import PDFPlumberLoader as pdfPL
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings as fee
from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma
from langchain_community.vectorstores.utils import DistanceStrategy
import logging
import pandas as pd
from pptx import Presentation
from transformers import AutoTokenizer as at 
from transformers.agents import Tool, HfEngine, ReactJsonAgent, ReactAgent
from tqdm import tqdm

# Set-up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

knowledge_base = pd.read_csv(r'C:\Users\ACER\Downloads\huggingface_doc.csv')
source_docs = [Document(page_content = knowledge_base["text"][i], metadata={"source":knowledge_base["source"][i].split("/")[1]}) 
               for i in knowledge_base.index]

logger.info(f"Loaded {len(source_docs)} documents from the knowledge base")

tokenizer = at.from_pretrained("thenlper/gte-small")




