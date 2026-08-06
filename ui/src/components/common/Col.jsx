import React from "react";
import { Col as AntdCol } from "antd";

export const Col = React.forwardRef((props, ref) => {
    return <AntdCol ref={ref} {...props} />;
});

export default Col;
