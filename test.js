function __refresh( force )
{
    if ( !force && (!this.entry || !this.isDirty) ) return;
    this.isDirty  = false;
    this._asArray = this.map_to_array();
    this._edges   = this._map_to_edges();
    this._partition();
}
