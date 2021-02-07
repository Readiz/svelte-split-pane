<script>
    import { HSplitPane, VSplitPane } from '../../src';
</script>

<main>
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
    <h1>H Splite Pane 75% : 25% with minSize "50px"</h1>
    <div class="wrapper">
    <HSplitPane leftPaneSize="75%" rightPaneSize="25%" minLeftPaneSize="50px" minRightPaneSize="50px">
        <left slot="left">
            Left Pane
        </left>
        <right slot="right">
            Right Pane
        </right>
    </HSplitPane>
    </div>
    <h1>V Splite Pane 75% : 25% with minSize "50px"</h1>
    <div class="wrapper">
    <VSplitPane topPanelSize="75%" downPanelSize="25%" minTopPaneSize="50px" minDownPaneSize="50px">
        <top slot="top">
            Top Pane
        </top>
        <down slot="down">
            Down Pane
        </down>
    </VSplitPane>
    </div>
</main>

<style>
main {
    text-align: center;
    margin: 0 auto;
}
div.wrapper {
    width: 90%;
    height: 400px;
    margin: auto;
}
left, right, top, down {
    width: 100%;
    height: 100%;
    display: block;
    text-align: center;
}
left, top {
    background-color:coral
}
right, down {
    background-color: cornflowerblue;
}
</style>
