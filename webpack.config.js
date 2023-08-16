const webpack = require("webpack");

module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            process: {
                env: {
                    NODE_ENV: JSON.stringify(process.env.NODE_ENV),
                    REACT_APP_BACKEND_URL: JSON.stringify(process.env.REACT_APP_BACKEND_URL),
                }
            }
        }),
    ],
};

