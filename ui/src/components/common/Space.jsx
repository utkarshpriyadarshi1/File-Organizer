import React from "react";
import { Space as AntdSpace } from "antd";

export const Space = React.forwardRef((props, ref) => {
    return <AntdSpace ref={ref} {...props} />;
});

export default Space;
