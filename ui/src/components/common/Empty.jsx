import React from "react";
import { Empty as AntdEmpty } from "antd";

export const Empty = React.forwardRef((props, ref) => {
    return <AntdEmpty ref={ref} {...props} />;
});

// Copy static properties of Empty
Empty.PRESENTED_IMAGE_SIMPLE = AntdEmpty.PRESENTED_IMAGE_SIMPLE;
Empty.PRESENTED_IMAGE_DEFAULT = AntdEmpty.PRESENTED_IMAGE_DEFAULT;

export default Empty;
