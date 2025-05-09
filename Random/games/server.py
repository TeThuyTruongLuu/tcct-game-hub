from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS, cross_origin
import os
from ebooklib import epub

app = Flask(__name__)
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/')
def home():
    return "✅ Server chạy ngon!"

@app.route('/api/epub', methods=['OPTIONS'])
def epub_options():
    response = make_response('', 204)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.route('/api/epub', methods=['POST'])
def generate_epub():
    try:
        data = request.json
        title = data.get('title', 'Truyen Khong Ten')
        chapters = data.get('chapters', [])

        if not chapters:
            response = jsonify({'error': 'Không có chương nào'})
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response, 400

        book = epub.EpubBook()
        book.set_title(title)
        book.set_language('vi')

        epub_chapters = []
        for idx, chapter in enumerate(chapters, 1):
            chap_title = chapter.get('title', f'Chương {idx}')
            chap_content = chapter.get('content', '')

            c = epub.EpubHtml(title=chap_title, file_name=f'chap_{idx}.xhtml', lang='vi')
            c.content = f'<h1>{chap_title}</h1><p>{chap_content.replace("\n", "<br/>")}</p>'
            book.add_item(c)
            epub_chapters.append(c)

        book.toc = tuple(epub_chapters)
        book.add_item(epub.EpubNavi())
        book.add_item(epub.EpubNCX())
        book.spine = ['nav'] + epub_chapters

        output_path = os.path.join('/tmp', f'{title}.epub')
        epub.write_epub(output_path, book)

        response = jsonify({'download_url': f'/download/{title}.epub'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    except Exception as e:
        response = jsonify({'error': str(e)})
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory('/tmp', filename, as_attachment=True)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
