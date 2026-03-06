// Encode text into image (LSB)
export const encodeMessage = (imageElement, secretMessage) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Append a unique binary marker: 16-bit 1111111111111110
    const binaryMessage = secretMessage.split('').map(char =>
        char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join('') + '1111111111111110';

    if (binaryMessage.length > data.length / 4) {
        throw new Error('Payload exceeds carrier capacity.');
    }

    for (let i = 0; i < binaryMessage.length; i++) {
        const bit = parseInt(binaryMessage[i]);
        // Modify Red channel LSB
        data[i * 4] = (data[i * 4] & ~1) | bit;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
};

// Decode text from image (LSB)
export const decodeMessage = (imageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let binaryMessage = '';
    for (let i = 0; i < data.length; i += 4) {
        binaryMessage += (data[i] & 1).toString();
    }

    let text = '';
    // Convert 8 bits into a char, checking for the 16-bit termination sequence
    for (let i = 0; i < binaryMessage.length; i += 8) {
        const byte = binaryMessage.slice(i, i + 8);
        if (byte === '11111111') {
            const nextByte = binaryMessage.slice(i + 8, i + 16);
            if (nextByte === '11111110') break;
        }
        if (byte.length === 8) {
            text += String.fromCharCode(parseInt(byte, 2));
        }
    }

    if (!text) {
        throw new Error('No hidden payload found or image corrupted.');
    }

    return text;
};
