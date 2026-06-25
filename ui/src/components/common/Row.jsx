import React from "react";
import { Row as AntdRow } from "antd";

export const Row = React.forwardRef((props, ref) => {
    return <AntdRow ref={ref} {...props} />;
});

export default Row;
