import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { COLORS, MOOD_EMOJIS } from '../lib/constants';

interface DayData {
  date: string;
  score: number | null;
  label: string;
}

interface MoodChartProps {
  data: DayData[];
}

const CHART_WIDTH = 300;
const CHART_HEIGHT = 140;
const BAR_WIDTH = 28;
const MAX_BAR_HEIGHT = 100;

export default function MoodChart({ data }: MoodChartProps) {
  const colWidth = CHART_WIDTH / data.length;

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 30}>
        {/* Baseline */}
        <Line
          x1={0}
          y1={CHART_HEIGHT}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT}
          stroke={COLORS.surface2}
          strokeWidth={1}
        />

        {data.map((day, index) => {
          const x = index * colWidth + colWidth / 2;
          const barHeight = day.score ? (day.score / 5) * MAX_BAR_HEIGHT : 0;
          const y = CHART_HEIGHT - barHeight;
          const fill = day.score
            ? day.score >= 4
              ? COLORS.accent2
              : day.score === 3
              ? COLORS.accent
              : COLORS.muted
            : COLORS.surface2;

          return (
            <React.Fragment key={index}>
              {day.score !== null && (
                <Rect
                  x={x - BAR_WIDTH / 2}
                  y={y}
                  width={BAR_WIDTH}
                  height={barHeight}
                  fill={fill}
                  rx={6}
                />
              )}
              {day.score !== null && (
                <SvgText
                  x={x}
                  y={y - 6}
                  fontSize={14}
                  textAnchor="middle"
                >
                  {MOOD_EMOJIS[day.score]}
                </SvgText>
              )}
              <SvgText
                x={x}
                y={CHART_HEIGHT + 18}
                fontSize={10}
                fill={COLORS.muted}
                textAnchor="middle"
              >
                {day.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
});
