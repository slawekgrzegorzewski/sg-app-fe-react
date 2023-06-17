import {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
    // schema: 'localhost:8080/graphql',
    schema: './schema.graphql',
    // generates: {
    //     './src/types.ts': {
    //         schema: './schema.graphql',
    //         plugins: ['typescript', 'typescript-operations']
    //     }
    // }
    documents: ['src/**/*.tsx'],
    generates: {
        './src/__generated__/': {
            preset: 'client',
            plugins: [],
            presetConfig: {
                gqlTagName: 'gql',
            }
        }
    },
    ignoreNoDocuments: true,
};

export default config;