import React from "react";
import { Progress as AntdProgress } from "antd";

export const Progress = React.forwardRef((props, ref) => {
    return <AntdProgress ref={ref} {...props} />;
});

export default Progress;
