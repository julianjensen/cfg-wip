class A
{
    /**
     * @param {BlockStatement} node
     * @param {BasicBlock} current
     */
    BlockStatement( node, current )
    {
        const isFunc = node.parent.type.includes( 'Function' ) || node.parent.type === Syntax.IfStatement;

        if ( !isFunc ) this.scopes.push_scope( 'block', node.parent );
        const b = this.walk( node.body, current );
        if ( !isFunc ) this.scopes.pop_scope();

        return b;
    }
}
