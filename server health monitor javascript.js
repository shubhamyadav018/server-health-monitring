// Global variable for the Chart.js chart
let metricsChart;
const chartData = {
    labels: [], // Time labels
    datasets: [{
        label: 'CPU Usage (%)',
        data: [],
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
    }]
};

function initializeChart() {
    const canvas = document.getElementById('metricsChart');
    if (!canvas) {
        console.error("Canvas element with id 'metricsChart' not found.");
        return;
    }
    const ctx = canvas.getContext('2d');
    metricsChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            scales: {
                x: {
                    title: { display: true, text: 'Time' }
                },
                y: {
                    title: { display: true, text: 'CPU Usage (%)' },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

// Fetch and display all servers
function fetchServers() {
    fetch("/servers")
        .then(response => response.json())
        .then(data => {
            const serverListDiv = document.getElementById("server-list");
            if (!serverListDiv) {
                console.error("Element with id 'server-list' not found.");
                return;
            }
            serverListDiv.innerHTML = ""; // Clear current content

            data.forEach(server => {
                const serverItem = document.createElement("div");
                serverItem.className = "server-item";
                serverItem.innerHTML = `
          <h3>${server.name}</h3>
          <p><strong>CPU Usage:</strong> ${server.metrics.cpu_usage}%</p>
          <p><strong>Memory Usage:</strong> ${server.metrics.memory_usage}%</p>
          <button onclick="deleteServer('${server._id}')">Delete</button>
          <button onclick="openUpdateForm('${server._id}', '${server.name}', ${server.metrics.cpu_usage}, ${server.metrics.memory_usage})">Update</button>
          <button onclick="predictFailure('${server._id}')">Predict Failure</button>
          <button onclick="generateMaintenance('${server._id}')">Maintenance Schedule</button>
          <button onclick="visualizeServer('${server._id}', '${server.name}')">Visualize</button>
          <div id="result-${server._id}" class="result-area"></div>
        `;
                serverListDiv.appendChild(serverItem);
            });
        })
        .catch(error => console.error("Error fetching servers:", error));
}

function addServer() {
    const name = document.getElementById("server-name").value;
    const cpu_usage = parseInt(document.getElementById("cpu-usage").value);
    const memory_usage = parseInt(document.getElementById("memory-usage").value);

    const serverData = {
        name: name,
        metrics: { cpu_usage: cpu_usage, memory_usage: memory_usage },
        logs: []
    };

    fetch("/servers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(serverData)
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById("server-name").value = "";
            document.getElementById("cpu-usage").value = "";
            document.getElementById("memory-usage").value = "";
            fetchServers();
        })
        .catch(error => console.error("Error adding server:", error));
}

function deleteServer(serverId) {
    fetch(`/servers/${serverId}`, { method: "DELETE" })
        .then(response => response.json())
        .then(data => fetchServers())
        .catch(error => console.error("Error deleting server:", error));
}

function openUpdateForm(serverId, currentName, currentCpu, currentMemory) {
    const resultDiv = document.getElementById("result-" + serverId);
    if (!resultDiv) {
        console.error("Update container not found for server " + serverId);
        return;
    }
    resultDiv.innerHTML = `
    <h4>Update Server</h4>
    <input type="text" id="update-name-${serverId}" value="${currentName}" placeholder="Server Name">
    <input type="number" id="update-cpu-${serverId}" value="${currentCpu}" placeholder="CPU Usage">
    <input type="number" id="update-memory-${serverId}" value="${currentMemory}" placeholder="Memory Usage">
    <button onclick="updateServer('${serverId}')">Save</button>
  `;
}

function updateServer(serverId) {
    const updatedName = document.getElementById("update-name-" + serverId).value;
    const updatedCpu = parseInt(document.getElementById("update-cpu-" + serverId).value);
    const updatedMemory = parseInt(document.getElementById("update-memory-" + serverId).value);

    const updateData = {
        name: updatedName,
        metrics: { cpu_usage: updatedCpu, memory_usage: updatedMemory }
    };

    fetch(`/servers/${serverId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(data => fetchServers())
        .catch(error => console.error("Error updating server:", error));
}

function predictFailure(serverId) {
    fetch(`/predict_server_failure/${serverId}`)
        .then(response => response.json())
        .then(data => {
            const resultDiv = document.getElementById("result-" + serverId);
            if (resultDiv) {
                resultDiv.innerHTML = `<p>Predict Failure: ${data.is_likely_to_fail ? "Yes" : "No"}</p>`;
            }
        })
        .catch(error => console.error("Error predicting failure:", error));
}

function generateMaintenance(serverId) {
    fetch(`/generate_maintenance_schedule/${serverId}`)
        .then(response => response.json())
        .then(data => {
            const resultDiv = document.getElementById("result-" + serverId);
            if (resultDiv) {
                resultDiv.innerHTML += `<p>Maintenance Date: ${data.maintenance_date}</p>`;
            }
        })
        .catch(error => console.error("Error generating maintenance schedule:", error));
}

// New: Visualize historical data for a specific server
function visualizeServer(serverId, serverName) {
    fetch(`/server_history/${serverId}`)
        .then(response => response.json())
        .then(data => {
            // Update chart data with the fetched history
            chartData.labels = data.labels;
            chartData.datasets[0].data = data.data;
            if (metricsChart) {
                metricsChart.update();
            }
            // Remove any existing heading in the visualization section
            var existingHeading = document.querySelector("#visualization-section h2");
            if (existingHeading) {
                existingHeading.parentNode.removeChild(existingHeading);
            }
            // Add a new heading for the current server visualization
            const heading = document.createElement("h2");
            heading.textContent = `Historical CPU Usage for ${serverName}`;
            const vizSection = document.getElementById("visualization-section");
            vizSection.insertBefore(heading, document.getElementById("metricsChart"));
        })
        .catch(error => console.error("Error fetching server history:", error));
}

// Initialize chart and fetch servers on page load
document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    fetchServers();
});
