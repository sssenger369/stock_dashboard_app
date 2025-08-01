FROM python:3.11-slim 
WORKDIR /app 
RUN pip install fastapi uvicorn pandas pyarrow google-cloud-storage mysql-connector-python 
COPY cloud_migration_service_new.py . 
CMD ["uvicorn", "cloud_migration_service_new:app", "--host", "0.0.0.0", "--port", "8080"] 
