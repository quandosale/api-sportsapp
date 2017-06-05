'use strict';

module.exports = class Signal {
    filename = '';
    bitsPerSample = 0;
    id = '';
    firstVal = 0;
    RandomAccessFile IOFile = null;
    stride = 0;
    indexInFile = 0;
    fileLen = 0;
    Open() {
        final File root = new File(Environment.getExternalStorageDirectory(), "ECG Data");
        if (!root.exists()) {
            root.mkdir();
        }
        File f;

        f = new File(root, filename);
        if (!f.exists()) return;

        switch (bitsPerSample) {
            case 12:
                stride = 3;
                break;
            default:
                break;
        }
        try {
            IOFile = new RandomAccessFile(f, "rw");
            var buf = new byte[stride];
            IOFile.read(buf);
            var rst = parse(buf);

            if (bitsPerSample == 12) {
                if (rst[0] == firstVal) indexInFile = 0;
                if (rst[1] == firstVal) indexInFile = 1;
            }
            fileLen = IOFile.length();

        } catch (e) {
            e.printStackTrace();
        }


    }
    parse(bytes) {
        if (bitsPerSample == 12) {
            var first = (bytes[0] & 0xff) + (bytes[1] & 0xf) * 256;
            if (first > 2048) first = first - 4096;
            var second = ((bytes[1] >> 8) & 0xf) * 256 + (bytes[2] & 0xff);
            if (second > 2048) second = second - 4096;
            var rst = new int[2];
            rst[0] = first;
            rst[1] = second;
            return rst;
        }
        return null;
    }
    Close() {
        if (IOFile == null) return;
        try {
            IOFile.close();
        } catch (e) {
            e.printStackTrace();
        }
    }
    Skip(pos) {
        if (IOFile == null) return;
        try {
            IOFile.seek(pos * stride);
        } catch (e) {
            e.printStackTrace();
        }
    }
    Read(buffer, len) {
        if (IOFile == null) return 0;
        var bytes = new byte[stride];
        var readBytes = 0;
        try {
            var curFileOffset = IOFile.getFilePointer();
            readBytes = (int)(fileLen - curFileOffset);
            readBytes = Math.max(0, readBytes);

        } catch (e) {
            e.printStackTrace();
        }
        readBytes /= 3;
        readBytes = Math.min(readBytes, len);
        for (var i = 0; i < readBytes; i++) {
            try {
                IOFile.read(bytes);
            } catch (e) {
                e.printStackTrace();
            }
            var rst = parse(bytes);
            buffer[i] = rst[indexInFile] * 4 + (int)(Math.pow(2, bitsPerSample - 1));

        }
        return readBytes;
    }
}