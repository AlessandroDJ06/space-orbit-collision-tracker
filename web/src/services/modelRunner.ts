import * as ort from 'onnxruntime-web';

export class OnnxPredictor {
    private session: ort.InferenceSession | null = null;

    async loadModel(modelPath: string) {
        try {
            this.session = await ort.InferenceSession.create(modelPath);
        } catch (e) {
            console.error('error loading model', e);
        }
    }

    async runInference(inputData: Float32Array, dims: number[]) {
        if (!this.session) {
            throw new Error('Model is not loaded!');
        }

        try {
            const tensor = new ort.Tensor('float32', inputData, dims);
            const feeds: Record<string, ort.Tensor> = {
                [this.session.inputNames[0]]: tensor
            };

            const results = await this.session.run(feeds);

            const outputKey = this.session.outputNames[0];
            const outputTensor = results[outputKey];

            console.log('Resultaat van ONNX:', outputTensor.data);
            return outputTensor.data;

        } catch (e) {
            console.error('Fout tijdens inferentie:', e);
            return null;
        }
    }
}