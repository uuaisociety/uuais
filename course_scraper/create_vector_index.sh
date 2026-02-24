#!/bin/bash

# Ensure gcloud is initialized and authenticated
# Run: gcloud init (if you haven't already)
# To create the composite vector index for the 768-dimensional embedding field
# in the 'courses' collection, run the following:

echo "Creating Vector Index for 'courses' collection on the 'embedding' field..."

# Make sure you are using the correct project
PROJECT_ID=$(gcloud config get-value project)
echo "Using project: $PROJECT_ID"

# This requires the gcloud alpha components, make sure they are installed:
# gcloud components install alpha

gcloud alpha firestore indexes composite create \
    --project=$PROJECT_ID \
    --collection-group=courses \
    --query-scope=COLLECTION \
    --field-config=vector-config='{"dimension":768,"flat": "{}"}',field-path=embedding

echo "Done! Check your Google Cloud Console to see the index building."
