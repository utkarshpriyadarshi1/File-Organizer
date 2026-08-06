import React from "react";
import { Flex as AntdFlex } from "antd";

export const Flex = React.forwardRef((props, ref) => {
    return <AntdFlex ref={ref} {...props} />;
});

export default Flex;
