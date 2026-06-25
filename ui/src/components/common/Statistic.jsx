import React from "react";
import { Statistic as AntdStatistic } from "antd";

export const Statistic = React.forwardRef((props, ref) => {
    return <AntdStatistic ref={ref} {...props} />;
});

export default Statistic;
