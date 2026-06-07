(function(global) {
    const CorrelationEngine = {
        // Returns a list of tasks that share the same subject/category as the input task
        getRelatedTasks: function(currentTask, allTasks) {
            if (!currentTask.category) return [];
            
            return allTasks.filter(task => 
                task.id !== currentTask.id && 
                task.category === currentTask.category
            );
        },

        // Returns a summary count of related tasks for the UI badge
        getCorrelationCount: function(currentTask, allTasks) {
            return this.getRelatedTasks(currentTask, allTasks).length;
        }
    };

    global.CorrelationEngine = CorrelationEngine;
})(window);