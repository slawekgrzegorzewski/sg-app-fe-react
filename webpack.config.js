const webpack = require("webpack");

module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            process: {
                env: {
                    NODE_ENV: JSON.stringify(process.env.NODE_ENV),
                    REACT_APP_BACKEND_URL: JSON.stringify(process.env.REACT_APP_BACKEND_URL),
                    REACT_APP_COGNITO_CLIENT_ID: JSON.stringify(process.env.REACT_APP_COGNITO_CLIENT_ID),
                    REACT_APP_COGNITO_REDIRECT_URI: JSON.stringify(process.env.REACT_APP_COGNITO_REDIRECT_URI),
                    REACT_APP_COGNITO_LOGIN_URI: JSON.stringify(process.env.REACT_APP_COGNITO_LOGIN_URI),
                    REACT_APP_COGNITO_TOKEN_URI: JSON.stringify(process.env.REACT_APP_COGNITO_TOKEN_URI),
                }
            }
        }),
    ],
};

