<script>
    import { HSplitPane, VSplitPane } from '../../src';

    let classPointerEventsNone;

    const onMouseDown = () => {
        classPointerEventsNone = 'pointer-events-none';
    }
    const onMouseUp = () => {
        classPointerEventsNone = '';
    }
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

    <h1>H Splite Pane Iframe</h1>
    <div class="wrapper">
        <HSplitPane onMouseDown="{onMouseDown}" onMouseUp="{onMouseUp}">
            <iframe slot="left" class="{classPointerEventsNone}" src="https://example.com" title="left" border="none">
            </iframe>
            <iframe slot="right" class="{classPointerEventsNone}" src="https://example.com" title="right" border="none">
            </iframe>
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
    <h1>V Splite Pane Iframe</h1>
    <div class="wrapper">
        <VSplitPane onMouseDown="{onMouseDown}" onMouseUp="{onMouseUp}">
            <iframe slot="top" class="{classPointerEventsNone}" src="https://example.com" title="top">
            </iframe>
            <iframe slot="down" class="{classPointerEventsNone}" src="https://example.com" title="down">
            </iframe>
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

iframe {
    width: 100%;
    height: 100%;
    border: 0;
}
.pointer-events-none {
    pointer-events: none;
}
</style>
