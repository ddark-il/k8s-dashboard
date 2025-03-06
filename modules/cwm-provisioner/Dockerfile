FROM python:3.9.21

WORKDIR /app
COPY main.py ./
RUN pip3 install paramiko flask requests
EXPOSE 5000
CMD ["python3","-u", "main.py"]