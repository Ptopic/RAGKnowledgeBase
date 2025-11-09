from flask import Flask, request, jsonify
from docling.document_converter import DocumentConverter
import tempfile
import os

app = Flask(__name__)
converter = DocumentConverter()

@app.route('/convert', methods=['POST'])
def convert_document():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Convert document
        result = converter.convert(tmp_path)

        # Extract markdown
        markdown = result.document.export_to_markdown()

        # Extract metadata
        metadata = {
            'pages': len(result.document.pages) if hasattr(result.document, 'pages') else None,
            'title': result.document.name if hasattr(result.document, 'name') else None,
        }

        return jsonify({
            'document': {
                'markdown': markdown,
                'metadata': metadata
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
