FROM python:3.7-stretch
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
COPY . .
CMD python server.py