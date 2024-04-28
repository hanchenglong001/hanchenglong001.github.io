import requests
from pyscript import document
import jinjia2

def test(event):
    output_div = document.querySelector("#output")
    output_div.innerText =requests.get("http://10.15.112.154:11000/dzhvideo/livenext").json()