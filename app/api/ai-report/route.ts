import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { fileName, headers, xKey, yKey, chartType, stats, sampleRows } = await req.json();

    // 构造详细的统计字符串
    const statsText = Object.entries(stats)
      .map(([k, v]) => `${k}: ${v}`)
      .join('；');

    const userMessage = `你是一个数据分析专家。用户上传了一个CSV文件“${fileName}”，列名包括：${headers.join(', ')}。用户选择了 X 轴为“${xKey}”，Y 轴为“${yKey}”，图表类型为${chartType === 'bar' ? '柱状图' : '折线图'}。基于全部数据（共 ${stats.行数} 行），统计信息如下：${statsText}。数据样本（前3行）为：${JSON.stringify(sampleRows)}。请根据这些信息，写一段简短（约150-250字）的数据分析报告，指出趋势、异常点、分布特征或结论。语言流畅，专业，不要出现“AI”等自称。直接返回报告文本。`;

    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '服务器未配置 API 密钥' }, { status: 500 });
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: userMessage }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('智谱 API 错误:', response.status, errorText);
      return NextResponse.json({ error: `AI 服务返回错误: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const report = data.choices[0].message.content;
    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('后端错误:', error);
    return NextResponse.json({ error: error.message || '服务器内部错误' }, { status: 500 });
  }
}