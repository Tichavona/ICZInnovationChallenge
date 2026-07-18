import streamlit as st
import requests

# Backend URL for Flask app
backend_url = "http://localhost:5000/recognize"

st.title("Image Recognition & Story Generation")

# Upload image
uploaded_file = st.file_uploader("Upload an image", type=["jpg", "jpeg", "png"])

# If an image is uploaded
if uploaded_file:
    # Display the image
    st.image(uploaded_file, caption="Uploaded Image", use_column_width=True)

    # Send image to Flask backend for recognition
    files = {"file": uploaded_file.getvalue()}
    response = requests.post(backend_url, files=files)

    if response.status_code == 200:
        recognized_object = response.json().get("recognized_object")
        st.write(f"Recognized Object: {recognized_object}")

        # Generate story using recognized object
        if recognized_object:
            st.write("Fetching a story for you...")

            # Use recognized_object as a prompt for LLM story generation
            prompt = f"Tell a story about a {recognized_object}."
            # Here we call an LLM API or your custom model to get a story based on recognized_object
            # For example:
            story = generate_story_from_prompt(prompt)  # Replace with actual LLM call

            # Display the story
            st.write("### Story")
            st.write(story)
    else:
        st.error("Failed to recognize the image. Try again.")
