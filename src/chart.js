/*
const loadJson = (file, callback) => {
  const xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', file, true);
  xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == '200') {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
};

loadJson('./sti-full.json', text => {
  const data = JSON.parse(text);
  console.log(data);
});
*/

const loadChart = d3.json('sti-full.json').then(data => {
  const chartResultsData = data['chart']['result'][0];
  const quoteData = chartResultsData['indicators']['quote'][0];

  return chartResultsData['timestamp'].map((time, index) => ({
    date: new Date(time * 1000),
    high: quoteData['high'][index],
    low: quoteData['low'][index],
    open: quoteData['open'][index],
    close: quoteData['close'][index],
    volume: quoteData['volume'][index]
  }));
});

loadChart.then(data => {
  console.log(data);
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = window.innerWidth - margin.left - margin.right; // Use the window's width
  const height = window.innerHeight - margin.top - margin.bottom; // Use the window's height
  const timeFormat = d3.timeFormat('%I:%M %p %a %Y');

  // find data range
  const xMin = d3.min(data, d => {
    return Math.min(d['date']);
  });

  const xMax = d3.max(data, d => {
    return Math.max(d['date']);
  });

  const yMin = d3.min(data, d => {
    return Math.min(d['close']);
  });

  const yMax = d3.max(data, d => {
    return Math.max(d['close']);
  });

  // scale using range
  const xScale = d3
    .scaleTime()
    .domain([xMin, xMax])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([height, 0]);

  const line = d3
    .line()
    .x(d => {
      return xScale(d['date']);
    })
    .y(d => {
      return yScale(d['close']);
    });

  // add chart SVG to the page
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // create an axes components
  svg
    .append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(xScale));
  svg.append('g').call(d3.axisLeft(yScale));

  // render line
  svg
    .append('path')
    .datum(data) // binds data to the line
    .style('fill', 'none')
    .attr('stroke', 'red')
    .attr('d', line);
});
