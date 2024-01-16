import graphql_1 from "graphql/index";
import {LocalDate} from "graphql-scalars/typings/typeDefs";

export const GraphQLLocalDate = new graphql_1.GraphQLScalarType({
    name: `LocalDate`,
    description: `A field whose value a date without time zone.`,
    serialize(value) {
        if (typeof value !== 'string') {
            throw Error(`Value is not string: ${value}`);
        }
        return value;
    },
    parseValue(value) {
        if (typeof value !== 'string') {
            throw Error(`Value is not string: ${value}`);
        }
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind !== graphql_1.Kind.STRING) {
            throw Error(`Can only validate strings.`);
        }
        return ast.value;
    },
    extensions: {
        codegenScalarType: 'string',
        jsonSchema: {
            type: 'string',
        },
    },
});

export const typeDefs = [
    LocalDate
];
