import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import postcss from "rollup-plugin-postcss";
    
const pkg = require('./package.json');
    
export default {
        input: 'src/index.js',
        output: [
            { file: pkg.module, 'format': 'es' },
            { file: pkg.main, 'format': 'umd', name: 'SplitPane' }
        ],
        plugins: [
            svelte(),
            postcss(),
            resolve()
        ],
};
