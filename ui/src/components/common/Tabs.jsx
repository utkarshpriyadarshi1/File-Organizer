import React from "react";
import { Tabs as AntdTabs } from "antd";

export const Tabs = React.forwardRef((props, ref) => {
    return <AntdTabs ref={ref} {...props} />;
});

export default Tabs;
