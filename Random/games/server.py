from flask import Flask, request, send_file
from ebooklib import epub
import requests
from bs4 import BeautifulSoup
import os
from io import BytesIO

app = Flask(__name__)

@app.route('/')
def home():
    return 'Server chạy OK!'

@app.route('/download_epub', methods=['POST'])
def download_epub():
    data = request.get_json()
    url = data.get('url')
    extra_content = data.get('extra_content', '')

    res = requests.get(url)
    soup = BeautifulSoup(res.text, 'html.parser')

    title = soup.title.text if soup.title else 'Truyen'

    book = epub.EpubBook()
    book.set_identifier('id123456')
    book.set_title(title)
    book.set_language('vi')
    book.add_author('Unknown')

    c1 = epub.EpubHtml(title='Nội dung', file_name='chap1.xhtml', lang='vi')
    c1.content = f'<h1>{title}</h1><p>{extra_content}</p><p>{soup.get_text()}</p>'

    book.add_item(c1)
    book.toc = (epub.Link('chap1.xhtml', 'Nội dung', 'chap1'),)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = ['nav', c1]

    buf = BytesIO()
    epub.write_epub(buf, book)
    buf.seek(0)
    return send_file(buf, as_attachment=True, download_name=f"{title}.epub", mimetype='application/epub+zip')

if __name__ == '__main__':
    app.run(debug=True)