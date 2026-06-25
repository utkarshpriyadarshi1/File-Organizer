import React from "react";
import { Spin as AntdSpin } from "antd";

export const Spin = React.forwardRef((props, ref) => {
    return <AntdSpin ref={ref} {...props} />;
});

export default Spin;
