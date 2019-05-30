FROM python:3.7-stretch
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
COPY . .
ENV DATABASE_URI database
ENV PORT 8000
CMD python server.py