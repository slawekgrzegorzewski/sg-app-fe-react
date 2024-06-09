import type {CodegenConfig} from '@graphql-codegen/cli'

const config: CodegenConfig = {
    schema: 'schema.graphql',
    documents: "**/*.graphql",
    generates: {
        'src/types.ts': {
            plugins: [
                'typescript',
                'typescript-resolvers',
                'typescript-operations',
                'typescript-document-nodes'
            ],
            config: {
                scalars: {
                    LocalDate: 'string'
                }
            }
        }
    }
}

export default config;