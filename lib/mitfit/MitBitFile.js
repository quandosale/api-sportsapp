'use strict';

module.exports = class MitBitFile {


    constructor() {
        this.filename = '';
        totalSamples = 0;
        samplesPerSecond = 0;
        signalNums = 0;
        datfilename = '';
        Stack < Signal > signals = new Stack < Signal > ();
        Signal selSignal;
        sampleCounter = 0;
    }

    Skip(pos) {
        sampleCounter = pos;
        selSignal.Skip(pos);
    }

    Read(buf, len) {
        var readbytes = selSignal.Read(buf, len);
        sampleCounter += readbytes;
        return readbytes;
    }

    Open(filename) {
        Log.d("ffilename", filename);
        final File root = new File(Environment.getExternalStorageDirectory(), "ECG Data");
        if (!root.exists()) return;
        File f = new File(root, filename);

        if (!f.exists()) return;

        this.filename = filename;
        InputStreamReader reader = null;
        BufferedReader _in = null;
        line = '';

        try {
            FileInputStream fin = new FileInputStream(f);
            reader = new InputStreamReader(fin);
            _in = new BufferedReader(reader);
            line = _in.readLine();
            parts[] = line.split(" ");
            signalNums = Integer.parseInt(parts[1]);
            samplesPerSecond = Integer.parseInt(parts[2]);
            totalSamples = Integer.parseInt(parts[3]);
            for (var i = 0; i < signalNums; i++) {
                line = _in.readLine();
                part = line.split(" ");
                Signal signal = new Signal();
                signal.filename = part[0];
                signal.bitsPerSample = Integer.parseInt(part[3]);
                signal.firstVal = Integer.parseInt(part[5]);
                signals.push(signal);
            }

        } catch (e) {
            e.printStackTrace();
        }
        selSignal = signals.get(0);
        selSignal.Open();
    }

    Close() {
        selSignal.Close();
    }
}