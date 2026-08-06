import React from "react";
import { Card as AntdCard } from "antd";

export const Card = React.forwardRef((props, ref) => {
    return <AntdCard ref={ref} {...props} />;
});

export default Card;
