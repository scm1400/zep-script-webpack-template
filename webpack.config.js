const path = require('path');

module.exports = {
    mode: "production",
    entry: './main.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                loader: 'ts-loader',
                options: {
                    transpileOnly: false // 타입 체크를 포함하도록 설정
                }
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            'zep-script': path.resolve(__dirname, 'node_modules/zep-script')
        }
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'res'),
    },
    optimization: {
        minimize: false,
    },
};
