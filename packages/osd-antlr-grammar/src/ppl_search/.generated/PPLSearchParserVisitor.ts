// Generated from ./src/ppl_search/grammar/PPLSearchParser.g4 by ANTLR 4.13.1

import { AbstractParseTreeVisitor } from "antlr4ng";


import { SearchExpressionContext } from "./PPLSearchParser.js";
import { AndExpressionContext } from "./PPLSearchParser.js";
import { OrExpressionContext } from "./PPLSearchParser.js";
import { NotExpressionContext } from "./PPLSearchParser.js";
import { PrimaryExpressionContext } from "./PPLSearchParser.js";
import { ComparisonExpressionContext } from "./PPLSearchParser.js";
import { InExpressionContext } from "./PPLSearchParser.js";
import { ComparisonOperatorContext } from "./PPLSearchParser.js";
import { FieldContext } from "./PPLSearchParser.js";
import { ValueContext } from "./PPLSearchParser.js";
import { TermContext } from "./PPLSearchParser.js";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `PPLSearchParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export class PPLSearchParserVisitor<Result> extends AbstractParseTreeVisitor<Result> {
    /**
     * Visit a parse tree produced by `PPLSearchParser.searchExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSearchExpression?: (ctx: SearchExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.andExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAndExpression?: (ctx: AndExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.orExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitOrExpression?: (ctx: OrExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.notExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNotExpression?: (ctx: NotExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.primaryExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPrimaryExpression?: (ctx: PrimaryExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.comparisonExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitComparisonExpression?: (ctx: ComparisonExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.inExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitInExpression?: (ctx: InExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.comparisonOperator`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitComparisonOperator?: (ctx: ComparisonOperatorContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.field`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitField?: (ctx: FieldContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.value`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitValue?: (ctx: ValueContext) => Result;
    /**
     * Visit a parse tree produced by `PPLSearchParser.term`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTerm?: (ctx: TermContext) => Result;
}

