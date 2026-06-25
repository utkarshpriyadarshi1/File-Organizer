import React from "react";
import { Popconfirm as AntdPopconfirm } from "antd";

export const Popconfirm = React.forwardRef((props, ref) => {
    return <AntdPopconfirm ref={ref} {...props} />;
});

export default Popconfirm;
