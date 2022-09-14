# create an API that from pixel data in Hexadecimal creates an 50 by 50 image 

''' 
the request comes in
{
    "pixels": [
        '#bfbfbf',
        '#bfbfbf',
        '#bfbfbf',
        '#bfbfbf',
        ...
    ]
}

'''
from flask import Flask, request, jsonify
from PIL import Image
import io
import base64
import numpy as np

app = Flask(__name__)


@app.route('/api/pixeltoimg', methods=['POST'])
def hex_to_img():
    # get the data from the request
    data = request.get_json()
    pixels = data['pixels']

    # create a new image
    img = Image.new('RGB', (50, 50), color = 'black')
    pixels = [tuple(int(p.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) for p in pixels]
    img.putdata(pixels)
    img.save('img.png')

    # convert the image to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue())




    # return the base64 image
    return jsonify({'img': img_str.decode('utf-8')})

if __name__ == '__main__':
    app.run(debug=True)
