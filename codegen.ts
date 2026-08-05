import type {CodegenConfig} from '@graphql-codegen/cli'

const config: CodegenConfig = {
    schema: 'schema.graphql',
    documents: "**/*.graphql",
    generates: {
        'src/types.ts': {
            plugins: [
                {add: {content: "import Decimal from 'decimal.js';"}},
                'typescript',
                'typescript-resolvers',
                'typescript-operations',
                'typescript-document-nodes'
            ],
            config: {
                scalars: {
                    BigDecimal: {
                        input: 'Decimal | number | string',
                        output: 'number'
                    },
                    Currency: 'string',
                    LocalDate: 'string',
                    LocalDateTime: 'string',
                    URL: 'string',
                    UUID: 'string',
                    YearMonth: 'string',
                    Year: {
                        input: 'number | string',
                        output: 'number'
                    }
                }
            }
        }
    }
}

export default config;
