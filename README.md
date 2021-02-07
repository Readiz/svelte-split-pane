# Split Pane for Svelte

This is a splitter plugin for Svelte Application.
Easy to use to separate panes horizontally.

![](2021-02-07-23-58-06.png)

#### Usage

```html
<script>
    import { HSplitPane, VSplitPane } from 'svelte-split-pane';
</script>
<h1>H Splite Pane Default</h1>
<div class="wrapper">
<HSplitPane updateCallback={() => {
    console.log('HSplitPane Updated!');
}}>
    <left slot="left">
        Left Pane
    </left>
    <right slot="right">
        Right Pane
    </right>
</HSplitPane>
</div>
<h1>V Splite Pane Default</h1>
<div class="wrapper">
<VSplitPane updateCallback={() => {
    console.log('VSplitPane Updated!');
}}>
    <top slot="top">
        Top Pane
    </top>
    <down slot="down">
        Down Pane
    </down>
</VSplitPane>
</div>
```

...where leftPane / rightPane are components for each pane.

Example:
![](2020-12-21-01-44-02.png)

#### Optional Parameters
updateCallback: this is called when splitting is finished.
marginTop: marginTop value for splitter.
