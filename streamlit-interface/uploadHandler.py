import requests
import streamlit as st

# Prepare files for upload
# Prepare files for upload

def uploadHandler(subscriberNumber, uploaded_files, modeDB):
    if modeDB == "My Data":
        organisation = subscriberNumber
    elif modeDB == "Customer Service Assistant":
        organisation = "csAssistant"
    elif modeDB == "Knowledge Centre":
        organisation = "Zimpapers"
    elif modeDB == "Government":
        organisation = "Government"
    elif modeDB == "Agriculture":
        organisation = "Agriculture"
    else:
        organisation = "zimpapersPL"

    files = []
    for file in uploaded_files:
        files.append(('file', file))

    headers = {
        'Authorization': '',  # Example header
    }

    response = requests.post(
        "http://127.0.0.1:4110/saveDB",
        data={"organisation": organisation},
        files=files,
        headers=headers
    )

    #response = requests.post("http://172.22.240.1:8080/saveDB", data={"organisation": organisation}, files=files)
    response_data = response.json()
    system_status = response.status_code

    # if system_status == 200:
    #     st.sidebar.success("File uploaded successfully!")
    #     st.sidebar.write(response_data)
    # else:
    #     st.sidebar.error(response_data[0]["Status"])
    #     for i in response_data:
    #         st.sidebar.error(i["File name"])

    if system_status == 200:
        st.sidebar.success("File uploaded successfully!")
        st.sidebar.write(response_data)
    else:
        # Check if response_data is a list (as expected)
        if isinstance(response_data, list) and len(response_data) > 0:
            st.sidebar.error(response_data[0]["Status"])
            for i in response_data:
                st.sidebar.error(i["File name"])
        # Handle if response_data is a dictionary
        elif isinstance(response_data, dict):
            if "Status" in response_data:
                st.sidebar.error(response_data["Status"])
            if "File name" in response_data:
                st.sidebar.error(response_data["File name"])
            else:
                st.sidebar.error(f"Upload failed: {response_data}")
        else:
            st.sidebar.error(f"Upload failed with status code: {system_status}")
            st.sidebar.write(response_data)