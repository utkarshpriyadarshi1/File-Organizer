import React from "react";
import { Button as AntdButton } from "antd";

export const Button = React.forwardRef((props, ref) => {
    return <AntdButton ref={ref} {...props} />;
});

export default Button;
